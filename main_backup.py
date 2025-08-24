from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd
import ccxt
from tradingview_ta import TA_Handler, Interval
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

app = FastAPI(title="DCA Scanner API", version="1.0.0")

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Utility Fonksiyonları ----------
def atr(df: pd.DataFrame, n: int = 14) -> pd.Series:
    """Average True Range hesaplama"""
    h, l, c = df["high"], df["low"], df["close"]
    prev_c = c.shift(1)
    tr = np.maximum(h - l, np.maximum(abs(h - prev_c), abs(l - prev_c)))
    return pd.Series(tr).rolling(n).mean()

def obv(df: pd.DataFrame) -> pd.Series:
    """On Balance Volume hesaplama"""
    up = (df["close"] > df["close"].shift(1)).astype(int)
    down = (df["close"] < df["close"].shift(1)).astype(int) * -1
    dirn = (up + down).fillna(0)
    return (dirn * df["volume"]).cumsum()

def ema(s: pd.Series, n: int) -> pd.Series:
    """Exponential Moving Average hesaplama"""
    return s.ewm(span=n, adjust=False).mean()

def val_from_histogram(df: pd.DataFrame, bins: int = 100) -> tuple[float, float]:
    """Hacim ağırlıklı fiyat histogramından VAL/VAH hesaplama"""
    typical = (df["high"] + df["low"] + df["close"]) / 3.0
    
    # Histogram oluştur
    hist, edges = np.histogram(
        typical, 
        bins=bins, 
        range=(df["low"].min(), df["high"].max()), 
        weights=df["volume"]
    )
    
    if hist.sum() == 0:
        return df["low"].min(), df["high"].max()
    
    # POC (Point of Control) bul
    poc_idx = int(np.argmax(hist))
    total = hist.sum()
    low_idx = high_idx = poc_idx
    cum = hist[poc_idx]
    
    # POC etrafında %70 hacim kapsayacak şekilde genişlet
    while cum / total < 0.70 and (low_idx > 0 or high_idx < bins - 1):
        if low_idx > 0 and (high_idx == bins - 1 or hist[low_idx - 1] >= hist[high_idx + 1]):
            low_idx -= 1
            cum += hist[low_idx]
        elif high_idx < bins - 1:
            high_idx += 1
            cum += hist[high_idx]
        else:
            break
    
    val_price = edges[low_idx]
    vah_price = edges[high_idx + 1]
    return float(val_price), float(vah_price)

def compute_levels(df: pd.DataFrame, lookback: int = 120, val_frac: float = 0.25) -> tuple[float, float, float, float]:
    """RL, VAL, RH, H seviyelerini hesapla"""
    win = df.tail(lookback).copy()
    RH, RL = float(win["high"].max()), float(win["low"].min())
    H = RH - RL
    
    try:
        VAL, _VAH = val_from_histogram(win, bins=100)
    except Exception:
        VAL = RL + val_frac * H
    
    return RL, VAL, RH, H

def ccxt_ohlcv(exchange: str, symbol: str, tf: str = "1d", limit: int = 400) -> pd.DataFrame:
    """CCXT ile OHLCV verisi çekme"""
    try:
        ex = getattr(ccxt, exchange)({"enableRateLimit": True})
        ohlcv = ex.fetch_ohlcv(symbol, timeframe=tf, limit=limit)
        df = pd.DataFrame(ohlcv, columns=["ts", "open", "high", "low", "close", "volume"])
        return df
    except Exception as e:
        print(f"CCXT error for {symbol}: {e}")
        return pd.DataFrame()

def tv_get_analysis(symbol: str, market: str, tf: str = "1d") -> Optional[Dict[str, Any]]:
    """TradingView'dan teknik analiz verisi çekme"""
    try:
        # Market'e göre exchange belirle
        if market == "crypto":
            exchange = "BINANCE"
        elif market == "bist":
            exchange = "BIST"
        elif market == "us":
            exchange = "NASDAQ"
        elif market == "fx":
            exchange = "FX_IDC"
        else:
            exchange = "BINANCE"
        
        # Timeframe'i TradingView formatına çevir
        if tf == "1d":
            interval = Interval.DAILY
        elif tf == "4h":
            interval = Interval.INTERVAL_4_HOURS
        else:
            interval = Interval.DAILY
        
        # TradingView handler oluştur
        handler = TA_Handler(
            symbol=symbol,
            exchange=exchange,
            screener="turkey" if market == "bist" else "crypto" if market == "crypto" else "america",
            interval=interval,
            timeout=10
        )
        
        # Analiz verisi çek
        analysis = handler.get_analysis()
        
        if analysis:
            return {
                "symbol": symbol,
                "market": market,
                "close": analysis.indicators.get("close", 0),
                "high": analysis.indicators.get("high", 0),
                "low": analysis.indicators.get("low", 0),
                "volume": analysis.indicators.get("volume", 0),
                "rsi": analysis.indicators.get("RSI", 50),
                "macd": analysis.indicators.get("MACD.macd", 0),
                "macd_signal": analysis.indicators.get("MACD.signal", 0),
                "sma_20": analysis.indicators.get("SMA20", 0),
                "sma_50": analysis.indicators.get("SMA50", 0),
                "ema_20": analysis.indicators.get("EMA20", 0),
                "ema_50": analysis.indicators.get("EMA50", 0),
                "bb_upper": analysis.indicators.get("BB.upper", 0),
                "bb_lower": analysis.indicators.get("BB.lower", 0),
                "bb_middle": analysis.indicators.get("BB.middle", 0),
                "atr": analysis.indicators.get("ATR", 0),
                "summary": analysis.summary,
                "oscillators": analysis.oscillators,
                "moving_averages": analysis.moving_averages,
                "indicators": analysis.indicators
            }
        
        return None
        
    except Exception as e:
        print(f"TradingView error for {symbol}: {e}")
        return None

def compute_signals_tv(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """TradingView verisi ile DCA sinyallerini hesapla"""
    try:
        # Temel değerler
        close = float(analysis.get("close", 0))
        high = float(analysis.get("high", 0))
        low = float(analysis.get("low", 0))
        volume = float(analysis.get("volume", 0))
        rsi = float(analysis.get("rsi", 50))
        atr = float(analysis.get("atr", 1))
        
        # Moving averages
        ema20 = float(analysis.get("ema_20", close))
        ema50 = float(analysis.get("ema_50", close))
        sma20 = float(analysis.get("sma_20", close))
        sma50 = float(analysis.get("sma_50", close))
        
        # Bollinger Bands
        bb_upper = float(analysis.get("bb_upper", close * 1.02))
        bb_lower = float(analysis.get("bb_lower", close * 0.98))
        bb_middle = float(analysis.get("bb_middle", close))
        
        # MACD
        macd = float(analysis.get("macd", 0))
        macd_signal = float(analysis.get("macd_signal", 0))
        
        # TradingView özetleri
        summary = analysis.get("summary", {})
        oscillators = analysis.get("oscillators", {})
        moving_averages = analysis.get("moving_averages", {})
        
        # Basit seviye hesaplamaları
        RL = low * 0.95  # Support seviyesi
        RH = high * 1.05  # Resistance seviyesi
        H = RH - RL
        VAL = RL + 0.25 * H  # Value Area Low
        
        # Volume ratio (basit hesaplama)
        vol_ratio = 1.0  # TradingView'da volume ratio yok, varsayılan 1.0
        
        # Sinyal tespiti
        # RSI bazlı sinyaller
        rsi_oversold = rsi < 30
        rsi_overbought = rsi > 70
        
        # Moving average sinyalleri
        ema_bullish = ema20 > ema50
        sma_bullish = sma20 > sma50
        
        # Bollinger Band sinyalleri
        bb_squeeze = (bb_upper - bb_lower) / bb_middle < 0.05
        bb_lower_touch = close <= bb_lower * 1.01
        bb_upper_touch = close >= bb_upper * 0.99
        
        # MACD sinyalleri
        macd_bullish = macd > macd_signal
        macd_cross_up = macd > macd_signal and macd > 0
        
        # TradingView özet skorları
        summary_score = 0
        if summary.get("RECOMMENDATION") == "BUY":
            summary_score = 1.0
        elif summary.get("RECOMMENDATION") == "STRONG_BUY":
            summary_score = 1.5
        elif summary.get("RECOMMENDATION") == "SELL":
            summary_score = -0.5
        elif summary.get("RECOMMENDATION") == "STRONG_SELL":
            summary_score = -1.0
        
        # Kategori belirleme
        if bb_upper_touch and macd_bullish and ema_bullish:
            category = "Near-Breakout"
        elif bb_lower_touch and rsi_oversold:
            category = "Dip-Reclaim"
        elif close > RH:
            category = "Breakout"
        elif rsi_oversold and bb_lower_touch:
            category = "DCA"
        else:
            category = "Neutral"
        
        # Skorlama
        score = 0
        
        # RSI skoru (0-20)
        if rsi < 30:
            score += 20
        elif rsi < 40:
            score += 15
        elif rsi < 50:
            score += 10
        
        # Moving average skoru (0-20)
        if ema_bullish and sma_bullish:
            score += 20
        elif ema_bullish or sma_bullish:
            score += 10
        
        # MACD skoru (0-20)
        if macd_cross_up:
            score += 20
        elif macd_bullish:
            score += 10
        
        # Bollinger Band skoru (0-20)
        if bb_lower_touch:
            score += 20
        elif bb_squeeze:
            score += 10
        
        # TradingView özet skoru (0-20)
        score += max(0, summary_score * 10)
        
        # Skoru 0-100 arasında sınırla
        score = max(0, min(100, score))
        
        return {
            "RL": RL, "VAL": VAL, "RH": RH, "H": H, "ATR": atr, "volRatio": vol_ratio,
            "isDCA": category == "DCA", "isDipReclaim": category == "Dip-Reclaim", 
            "isNearBreakout": category == "Near-Breakout", "isBreakout": category == "Breakout",
            "score": score, "ema20": ema20, "ema50": ema50, "avwap": bb_middle, 
            "close": close, "category": category,
            "rsi": rsi, "macd": macd, "bb_upper": bb_upper, "bb_lower": bb_lower
        }
        
    except Exception as e:
        print(f"Error computing signals for TradingView data: {e}")
        return {
            "RL": 0, "VAL": 0, "RH": 0, "H": 0, "ATR": 0, "volRatio": 0,
            "isDCA": False, "isDipReclaim": False, "isNearBreakout": False, "isBreakout": False,
            "score": 0, "ema20": 0, "ema50": 0, "avwap": 0, "close": 0, "category": "Neutral"
        }

# ---------- Piyasa Sembolleri (Test için sadece 10 büyük) ----------
BIST = ["THYAO", "GARAN", "KCHOL", "AKBNK", "SISE", 
        "TUPRS", "EREGL", "ASELS", "BIMAS", "YKBNK"]

US = ["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "NFLX", "AMD", "SPY"]

FX = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "USDCAD", 
      "AUDUSD", "NZDUSD", "USDCHF", "GBPJPY", "EURJPY"]

# Test için sadece 10 büyük kripto
CRYPTO_TOP_10 = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", 
                  "AVAXUSDT", "DOTUSDT", "MATICUSDT", "LINKUSDT", "UNIUSDT"]

# ---------- Pydantic Modelleri ----------
class ScanItem(BaseModel):
    symbol: str
    market: str
    score: float
    category: str
    RL: float
    VAL: float
    RH: float
    H: float
    ATR: float
    volRatio: float
    close: float

class ChartResponse(BaseModel):
    ohlcv: Dict[str, List[float]]
    levels: Dict[str, float]
    targets: List[Dict[str, Any]]
    signals: Dict[str, Any]
    entries: Dict[str, float]
    stops: Dict[str, float]

# ---------- API Endpoints ----------
@app.get("/health")
def health():
    """Sağlık kontrolü"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/test-bist")
def test_bist():
    """BIST test endpoint'i"""
    try:
        # Sadece THYAO ile test et
        symbol = "THYAO"
        print(f"Testing {symbol} with TradingView...")
        
        analysis = tv_get_analysis(symbol, "bist", "1d")
        print(f"Analysis result: {analysis}")
        
        if analysis:
            return {"success": True, "data": analysis}
        else:
            return {"success": False, "error": "No data from TradingView"}
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@app.get("/symbols")
def symbols(market: str):
    """Piyasa sembollerini getir"""
    if market == "crypto":
        try:
            ex = ccxt.binance()
            mkts = ex.load_markets()
            syms = [m for m in mkts if mkts[m].get("quote") == "USDT" and mkts[m].get("spot")]
            return {"symbols": syms[:200]}  # Top 200 USDT çifti
        except Exception as e:
            return {"symbols": [], "error": str(e)}
    
    elif market == "bist":
        return {"symbols": BIST}
    
    elif market == "us":
        return {"symbols": US}
    
    elif market == "fx":
        return {"symbols": FX}
    
    return {"symbols": []}

@app.get("/scan")
def scan(market: str = "crypto", tf: str = "1d", lookback: int = 120):
    """DCA taraması yap"""
    results = []
    
    try:
        if market == "crypto":
            # Kripto taraması - sadece top 10
            for symbol in CRYPTO_TOP_10:
                try:
                    analysis = tv_get_analysis(symbol, market, tf)
                    if analysis is None:
                        continue
                    
                    signals = compute_signals_tv(analysis)
                    results.append({
                        **{"symbol": symbol, "market": "crypto"}, 
                        **signals
                    })
                except Exception as e:
                    print(f"Error scanning {symbol}: {e}")
                    continue
        
        elif market == "bist":
            # BIST taraması - sadece 10 büyük
            for symbol in BIST:
                try:
                    analysis = tv_get_analysis(symbol, market, tf)
                    if analysis is None:
                        continue
                    
                    signals = compute_signals_tv(analysis)
                    results.append({
                        **{"symbol": symbol, "market": "bist"}, 
                        **signals
                    })
                except Exception as e:
                    print(f"Error scanning {symbol}: {e}")
                    continue
        
        elif market == "us":
            # US taraması - sadece 10 büyük
            for symbol in US:
                try:
                    analysis = tv_get_analysis(symbol, market, tf)
                    if analysis is None:
                        continue
                    
                    signals = compute_signals_tv(analysis)
                    results.append({
                        **{"symbol": symbol, "market": "us"}, 
                        **signals
                    })
                except Exception as e:
                    print(f"Error scanning {symbol}: {e}")
                    continue
        
        elif market == "fx":
            # Forex taraması
            for symbol in FX:
                try:
                    analysis = tv_get_analysis(symbol, market, tf)
                    if analysis is None:
                        continue
                    
                    signals = compute_signals_tv(analysis)
                    results.append({
                        **{"symbol": symbol, "market": "fx"}, 
                        **signals
                    })
                except Exception as e:
                    print(f"Error scanning {symbol}: {e}")
                    continue
        
        # Skora göre sırala
        results = sorted(results, key=lambda x: x["score"], reverse=True)
        
        # Debug log
        print(f"Scan completed for {market}: {len(results)} results found")
        if results:
            print(f"Top 3 results: {[(r['symbol'], r['score'], r['category']) for r in results[:3]]}")
        
        return {"items": results, "count": len(results)}
    
    except Exception as e:
        return {"error": str(e), "items": []}

@app.get("/chart")
def chart(symbol: str, market: str, tf: str = "1d", lookback: int = 120):
    """Grafik verilerini getir"""
    try:
        df = None
        
        if market == "crypto":
            df = ccxt_ohlcv("binance", symbol, tf=tf, limit=600)
        else:
            df = yf_ohlcv(symbol, tf=tf)
        
        if df is None or df.empty:
            return {"error": "Veri bulunamadı"}
        
        # Sinyalleri hesapla
        signals = compute_signals(df, lookback)
        
        # Hedef fiyatlar
        RH, RL, H = signals["RH"], signals["RL"], signals["H"]
        targets = [
            {"label": "T1", "from": RH + 0.45 * H, "to": RH + 0.85 * H},
            {"label": "T2", "from": RH + 1.50 * H, "to": RH + 1.55 * H},
            {"label": "T3", "from": RH + 2.80 * H, "to": RH + 3.00 * H},
            {"label": "Psy1", "from": round((RH + RL) / 2, 2), "to": round((RH + RL) / 2, 2)}
        ]
        
        # Giriş önerileri
        entries = {
            "breakout": signals["RH"] + 0.1 * signals["ATR"],
            "retest": signals["RH"],
            "dca_avg": (signals["RL"] + signals["VAL"]) / 2,
            "dip_reclaim": signals["RL"] + 0.1 * signals["ATR"]
        }
        
        # Stop-loss seviyeleri
        stops = {
            "breakout": signals["RH"] - 0.8 * signals["ATR"],
            "retest": signals["RH"] - 1.0 * signals["ATR"],
            "dca": signals["RL"] - 0.25 * signals["ATR"],
            "dip_reclaim": signals["RL"] - 0.1 * signals["ATR"]
        }
        
        # Spring low (manipüle fitil)
        spring_low = float(df["low"].tail(lookback).min())
        
        return {
            "ohlcv": df.tail(600).to_dict(orient="list"),
            "levels": {
                "RL": signals["RL"],
                "VAL": signals["VAL"], 
                "RH": signals["RH"],
                "springLow": spring_low
            },
            "targets": targets,
            "signals": signals,
            "entries": entries,
            "stops": stops
        }
    
    except Exception as e:
        return {"error": f"Grafik verisi alınamadı: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
