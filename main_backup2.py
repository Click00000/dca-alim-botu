from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd
import ccxt
from tradingview_ta import TA_Handler, Interval
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

# BIST hisse listelerini import et
from bist_stocks_ak import BIST_STOCKS_AK, get_stocks_by_symbol as get_stocks_ak_by_symbol, search_stocks as search_stocks_ak
from bist_stocks_lz import BIST_STOCKS_LZ, get_stocks_by_symbol as get_stocks_lz_by_symbol, search_stocks as search_stocks_lz

app = FastAPI(title="DCA Scanner API", version="1.0.0")

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- BIST Hisse Fonksiyonları ----------
def get_all_bist_stocks():
    """Tüm BIST hisselerini birleştir"""
    return BIST_STOCKS_AK + BIST_STOCKS_LZ

def get_bist_stock_by_symbol(symbol: str):
    """Sembol ile BIST hissesi bul"""
    # Önce A-K listesinde ara
    stock = get_stocks_ak_by_symbol(symbol)
    if stock:
        return stock
    
    # Sonra L-Z listesinde ara
    stock = get_stocks_lz_by_symbol(symbol)
    if stock:
        return stock
    
    return None

def search_bist_stocks(query: str):
    """BIST hisselerinde arama yap"""
    results = []
    
    # A-K listesinde ara
    ak_results = search_stocks_ak(query)
    results.extend(ak_results)
    
    # L-Z listesinde ara
    lz_results = search_stocks_lz(query)
    results.extend(lz_results)
    
    return results

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
        # API rate limit için gecikme
        import time
        time.sleep(5)  # 5 saniye bekle - rate limit için
        
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
            interval = "1d"
        elif tf == "4h":
            interval = "4h"
        else:
            interval = "1d"
        
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
    """TradingView verisi ile DCA sinyallerini hesapla - Yeni Algoritma"""
    try:
        # Temel değerler
        close = float(analysis.get("close", 0))
        high = float(analysis.get("high", 0))
        low = float(analysis.get("low", 0))
        volume = float(analysis.get("volume", 0))
        rsi = float(analysis.get("rsi", 50))
        
        # ATR hesaplama - TradingView'dan gelmiyorsa manuel hesapla
        atr_raw = analysis.get("atr", 0)
        if atr_raw == 0 or atr_raw is None:
            # Basit ATR hesaplama: (High - Low) / 14
            atr = (high - low) / 14
        else:
            atr = float(atr_raw)
        
        # Moving averages
        ema20 = float(analysis.get("ema_20", close))
        ema50 = float(analysis.get("ema_50", close))
        sma20 = float(analysis.get("sma_20", close))
        sma50 = float(analysis.get("sma_50", close))
        
        # Bollinger Bands
        bb_upper = float(analysis.get("bb_upper", close * 1.02))
        bb_lower = float(analysis.get("bb_lower", close * 0.98))
        bb_middle = float(analysis.get("bb_middle", close))
        
        # bb_middle 0 ise close kullan
        if bb_middle == 0:
            bb_middle = close
        
        # MACD
        macd = float(analysis.get("macd", 0))
        macd_signal = float(analysis.get("macd_signal", 0))
        
        # TradingView özetleri
        summary = analysis.get("summary", {})
        oscillators = analysis.get("oscillators", {})
        moving_averages = analysis.get("moving_averages", {})
        
        # Basit seviye hesaplamaları (60 mum verisi olmadığı için basit)
        RL = low * 0.95  # Support seviyesi
        RH = high * 1.05  # Resistance seviyesi
        H = RH - RL
        VAL = RL + 0.25 * H  # Value Area Low
        
        # Volume ratio (basit hesaplama)
        vol_ratio = 1.0  # TradingView'da volume ratio yok, varsayılan 1.0
        
        # YENİ DCA ALGORİTMASI - Puanlama (0-100)
        score = 0
        score_details = {}
        
        # 1. Uzun süreli akümülasyon kontrolü (20 puan) - Pine Script algoritması
        # Range %20'den az ise akümülasyon (Pine Script'teki gibi)
        range_pct = H / max(RL, 0.01) * 100
        if range_pct <= 20:
            akumulasyon_puan = 20
        else:
            akumulasyon_puan = 0
        
        score += akumulasyon_puan
        score_details["akumulasyon"] = akumulasyon_puan
        
        # 2. Manipülasyon fitili (Spring) kontrolü (20 puan) - Pine Script algoritması
        # Spring toleransı %2 altına iğne + kapanış tekrar üstte
        spring_tol_pct = 2.0  # Pine Script'teki springTolPct
        spring_depth = RL * (1.0 - spring_tol_pct/100.0)
        spring_now = (low < spring_depth) and (close > RL)
        
        if spring_now:
            spring_puan = 20
            # Spring sonrası reclaim bonusu (5 puan) - Pine Script'teki gibi
            if close > RL:
                spring_puan += 5
        else:
            spring_puan = 0
        
        score += spring_puan
        score_details["spring"] = spring_puan
        
        # 3. OBV yukarı yönlü (15 puan) - Pine Script algoritması
        # OBV trendi (basit hesaplama)
        obv_puan = 0
        if rsi > 45 and close > (high + low) / 2:  # RSI yükseliyor ve fiyat ortalamanın üstünde
            obv_puan = 15
        elif rsi > 40:
            obv_puan = 10
        else:
            obv_puan = 5
        
        score += obv_puan
        score_details["obv"] = obv_puan
        
        # 4. Hacim patlaması (10 puan) - Pine Script algoritması
        # Volume spike (1.30x MA20) - Pine Script'teki volSpikeMul
        vol_spike_mul = 1.30
        if volume > 0:  # Volume verisi varsa
            hacim_puan = 10 if volume > 0 else 0  # Basit hesaplama
        else:
            hacim_puan = 5  # Volume verisi yoksa varsayılan
        
        score += hacim_puan
        score_details["hacim"] = hacim_puan
        
        # 5. Breakout'a yakınlık (10 puan) - Pine Script algoritması
        # Fiyat RH'a %5 mesafede mi? (Pine Script'teki nearPct = 5.0)
        near_pct = 5.0
        near_break = close >= RH * (1.0 - near_pct/100.0)
        
        if near_break:
            score += 10
            score_details["breakout_yakin"] = 10
        else:
            score_details["breakout_yakin"] = 0
        
        # 6. EMA kesişimi (10 puan) - Pine Script algoritması
        # EMA20>EMA50 && SMA20>SMA50 (Pine Script'teki maUp)
        ma_up = (ema20 > ema50) and (sma20 > sma50)
        ema_only_up = (ema20 > ema50)
        
        if ma_up:
            score += 10
            score_details["ema_kesisim"] = 10
        elif ema_only_up:
            score += 6  # Pine Script'teki gibi
            score_details["ema_kesisim"] = 6
        else:
            score_details["ema_kesisim"] = 0
        
        # 7. RSI düşükten toparlanma (10 puan) - Pine Script algoritması
        # RSI < 35 (Pine Script'teki rsiLow)
        rsi_low = rsi < 35
        
        if rsi_low:
            score += 10
            score_details["rsi_toparlanma"] = 10
        else:
            score_details["rsi_toparlanma"] = 0
        
        # Skoru 0-100 arasında sınırla
        score = max(0, min(100, score))
        
        # Kategori belirleme
        if score >= 70:
            category = "Strong DCA"
        elif score >= 50:
            category = "DCA"
        elif score >= 30:
            category = "Weak DCA"
        else:
            category = "No DCA Signal"
        
        # Pine Script'teki hedef bantları (T1, T2, T3)
        T1_from = RH + 0.45 * H
        T1_to = RH + 0.85 * H
        T2_from = RH + 1.50 * H
        T2_to = RH + 1.55 * H
        T3_from = RH + 2.80 * H
        T3_to = RH + 3.00 * H
        
        return {
            "RL": RL, "VAL": VAL, "RH": RH, "H": H, "ATR": atr, "volRatio": vol_ratio,
            "isDCA": score >= 50, "isDipReclaim": category == "Dip-Reclaim", 
            "isNearBreakout": category == "Near-Breakout", "isBreakout": category == "Breakout",
            "score": score, "ema20": ema20, "ema50": ema50, "avwap": bb_middle, 
            "close": close, "category": category,
            "rsi": rsi, "macd": macd, "bb_upper": bb_upper, "bb_lower": bb_lower,
            "score_details": score_details,  # Yeni: detaylı puanlar
            "range_pct": range_pct,  # Yeni: range yüzdesi
            # Pine Script hedef bantları
            "targets": {
                "T1": {"from": T1_from, "to": T1_to, "label": "Hedef 1"},
                "T2": {"from": T2_from, "to": T2_to, "label": "Hedef 2"},
                "T3": {"from": T3_from, "to": T3_to, "label": "Hedef 3"}
            }
        }
        
    except Exception as e:
        print(f"Error computing signals for TradingView data: {e}")
        return {
            "RL": 0, "VAL": 0, "RH": 0, "H": 0, "ATR": 0, "volRatio": 0,
            "isDCA": False, "isDipReclaim": False, "isNearBreakout": False, "isBreakout": False,
            "score": 0, "ema20": 0, "ema50": 0, "avwap": 0, "close": 0, "category": "Neutral"
        }

# ---------- Piyasa Sembolleri (Test için sadece 3 büyük) ----------
BIST = ["THYAO", "GARAN", "KCHOL"]

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
        # BIST hisse sayılarını test et
        ak_count = len(BIST_STOCKS_AK)
        lz_count = len(BIST_STOCKS_LZ)
        total_count = ak_count + lz_count
        
        # Birkaç örnek hisse göster
        sample_stocks = BIST_STOCKS_AK[:5] + BIST_STOCKS_LZ[:5]
        
        return {
            "success": True, 
            "ak_count": ak_count,
            "lz_count": lz_count,
            "total_count": total_count,
            "sample_stocks": sample_stocks
        }
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@app.get("/search-bist")
def search_bist(q: str = "", limit: int = 20):
    """BIST hisselerinde anında arama yap - type-ahead search"""
    try:
        if not q or len(q.strip()) < 1:
            # Boş arama - ilk 20 hisseyi göster
            all_stocks = get_all_bist_stocks()
            return {
                "success": True,
                "query": q,
                "results": all_stocks[:limit],
                "total_found": len(all_stocks[:limit]),
                "total_available": len(all_stocks)
            }
        
        # Arama yap
        query = q.strip().upper()
        results = search_bist_stocks(query)
        
        # Limit'e göre kırp
        limited_results = results[:limit]
        
        return {
            "success": True,
            "query": q,
            "results": limited_results,
            "total_found": len(results),
            "total_available": len(get_all_bist_stocks()),
            "showing": len(limited_results)
        }
            
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
        # Tüm BIST hisselerini al
        all_stocks = get_all_bist_stocks()
        # Sadece sembolleri döndür
        symbols = [stock["symbol"] for stock in all_stocks]
        return {
            "symbols": symbols,
            "total_count": len(symbols)
        }
    
    elif market == "us":
        return {"symbols": US}
    
    elif market == "fx":
        return {"symbols": FX}
    
    return {"symbols": []}

@app.get("/scan")
def scan(market: str = "crypto", tf: str = "1d", lookback: int = 120, symbol: str = None):
    """DCA taraması yap - symbol parametresi verilirse sadece o hisseyi tara"""
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
            if symbol:
                # Belirli bir hisseyi tara
                stock = get_bist_stock_by_symbol(symbol.upper())
                if stock:
                    try:
                        analysis = tv_get_analysis(symbol.upper(), market, tf)
                        if analysis is None:
                            return {"error": f"Hisse {symbol} için veri bulunamadı", "items": []}
                        
                        signals = compute_signals_tv(analysis)
                        results.append({
                            **{"symbol": symbol.upper(), "market": "bist", "name": stock["name"]}, 
                            **signals
                        })
                        print(f"Scanned single stock: {symbol.upper()} - {stock['name']}")
                    except Exception as e:
                        print(f"Error scanning {symbol}: {e}")
                        return {"error": f"Hisse {symbol} taranırken hata: {str(e)}", "items": []}
                else:
                    return {"error": f"Hisse {symbol} bulunamadı", "items": []}
            else:
                # Otomatik tarama - sadece test için 5 hisse
                all_stocks = get_all_bist_stocks()
                print(f"Auto-scanning 5 BIST stocks...")
                
                # Test için sadece ilk 5 hisseyi tara
                test_stocks = all_stocks[:5]
                
                for stock in test_stocks:
                    symbol = stock["symbol"]
                    try:
                        analysis = tv_get_analysis(symbol, market, tf)
                        if analysis is None:
                            continue
                        
                        signals = compute_signals_tv(analysis)
                        results.append({
                            **{"symbol": symbol, "market": "bist", "name": stock["name"]}, 
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
        analysis = tv_get_analysis(symbol, market, tf)
        
        if analysis is None:
            return {"error": "Veri bulunamadı"}
        
        # Sinyalleri hesapla
        signals = compute_signals_tv(analysis)
        
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
        
        return {
            "ohlcv": {},  # TradingView'da OHLCV verisi yok
            "levels": {
                "RL": signals["RL"],
                "VAL": signals["VAL"], 
                "RH": signals["RH"],
                "springLow": RL * 0.95
            },
            "targets": targets,
            "signals": signals,
            "entries": entries,
            "stops": stops
        }
    
    except Exception as e:
        return {"error": f"Grafik verisi alınamadı: {str(e)}"}

@app.get("/chart-bist")
def chart_bist(symbol: str, tf: str = "1d", lookback: int = 120):
    """BIST hissesi için grafik verilerini getir"""
    try:
        # Önce hisseyi BIST listesinde bul
        stock = get_bist_stock_by_symbol(symbol.upper())
        if not stock:
            return {"error": f"Hisse {symbol} BIST listesinde bulunamadı"}
        
        # TradingView'dan analiz al
        analysis = tv_get_analysis(symbol.upper(), "bist", tf)
        
        if analysis is None:
            return {"error": f"Hisse {symbol} için TradingView verisi bulunamadı"}
        
        # Sinyalleri hesapla
        signals = compute_signals_tv(analysis)
        
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
        
        return {
            "success": True,
            "stock_info": stock,
            "ohlcv": {},  # TradingView'da OHLCV verisi yok
            "levels": {
                "RL": signals["RL"],
                "VAL": signals["VAL"], 
                "RH": signals["RH"],
                "springLow": RL * 0.95
            },
            "targets": targets,
            "signals": signals,
            "entries": entries,
            "stops": stops
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"BIST grafik verisi alınamadı: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
