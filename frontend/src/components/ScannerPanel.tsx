import { useState } from "react";
import axios from "axios";
import { useAppStore } from "../store";
import { ScanItem } from "../types";
import LoadingSpinner from "./LoadingSpinner";

function Section({ title, items, color }: { title: string; items: ScanItem[]; color: string }) {
  const { setSelected } = useAppStore();

  if (items.length === 0) return null;

  return (
    <div className="my-4 sm:my-6">
      <h3 className={`text-base sm:text-lg font-semibold mb-3 px-3 py-2 rounded-lg ${color} text-white text-center sm:text-left`}>
        {title} ({items.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((item) => (
          <button
            key={item.symbol}
            onClick={() => setSelected(item)}
            className="text-left p-3 sm:p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 bg-white hover:bg-gray-50"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-mono font-bold text-base sm:text-lg">{item.symbol}</div>
              <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                item.score >= 80 ? "bg-green-100 text-green-800" :
                item.score >= 60 ? "bg-yellow-100 text-yellow-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {Math.round(item.score)}
              </div>
            </div>
            
            <div className="text-xs sm:text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.category === "Near-Breakout" ? "bg-blue-100 text-blue-800" :
                  item.category === "Dip-Reclaim" ? "bg-purple-100 text-purple-800" :
                  item.category === "DCA" ? "bg-green-100 text-green-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {item.category}
                </span>
              </div>
            </div>
            
            <div className="space-y-1 text-xs text-gray-500">
              <div>Close: <span className="font-mono">{item.close.toFixed(4)}</span></div>
              <div>RH: <span className="font-mono">{item.RH.toFixed(4)}</span></div>
              <div>Vol: <span className="font-mono">{(item.volRatio * 100).toFixed(0)}%</span></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ScannerPanel() {
  // Backend URL - Production'da environment variable kullan
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8014';
  
  const { market, timeframe, setItems, items, loading, setLoading, error, setError, clearError } = useAppStore();
  const [scanCount, setScanCount] = useState(0);
  const [searchSymbol, setSearchSymbol] = useState("");
  const [searchResult, setSearchResult] = useState<ScanItem | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Type-ahead search için yeni state'ler
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{symbol: string, name: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  async function runScan() {
    try {
      setLoading(true);
      clearError();
      
      console.log(`Starting scan for market: ${market}, timeframe: ${timeframe}`);
      
      let data;
      
      // BIST için özel scan endpoint kullan
      if (market === "bist") {
        const response = await axios.get(`${API_BASE_URL}/scan`, {
          params: { market, tf: timeframe }
        });
        data = response.data;
      } else {
        // Diğer piyasalar için eski endpoint
        const response = await axios.get(`${API_BASE_URL}/scan`, {
          params: { market, tf: timeframe }
        });
        data = response.data;
      }
      
      console.log("Scan response:", data);
      
      if (data.items && Array.isArray(data.items)) {
        setItems(data.items);
        setScanCount(prev => prev + 1);
        console.log(`Scan completed: ${data.items.length} items found`);
      } else {
        console.error("Invalid response format:", data);
        setError("Geçersiz yanıt formatı");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      setError(err.response?.data?.error || "Tarama sırasında hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  // Type-ahead search fonksiyonu
  async function fetchSearchSuggestions(query: string) {
    if (!query.trim() || query.length < 1) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      setSuggestionsLoading(true);
      
      if (market === "bist") {
        const response = await axios.get(`${API_BASE_URL}/search-bist`, {
          params: { q: query.trim(), limit: 10 }
        });
        
        if (response.data.success && response.data.results) {
          setSearchSuggestions(response.data.results);
          setShowSuggestions(true);
        }
      } else if (market === "crypto") {
        const response = await axios.get(`${API_BASE_URL}/search-crypto`, {
          params: { q: query.trim(), limit: 10 }
        });
        
        if (response.data.success && response.data.results) {
          setSearchSuggestions(response.data.results);
          setShowSuggestions(true);
        }
      }
    } catch (err: any) {
      console.error("Suggestions error:", err);
      setSearchSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function searchForSymbol() {
    if (!searchSymbol.trim()) return;
    
    try {
      setSearchLoading(true);
      clearError();
      setSearchResult(null);
      setShowSuggestions(false); // Önerileri gizle
      
      console.log(`Searching for symbol: ${searchSymbol} in market: ${market}`);
      
      let data;
      
      // BIST için özel endpoint kullan
      if (market === "bist") {
        const response = await axios.get(`${API_BASE_URL}/chart-bist`, {
          params: { symbol: searchSymbol.trim().toUpperCase(), tf: timeframe }
        });
        data = response.data;
      } else {
        // Diğer piyasalar için eski endpoint
        const response = await axios.get(`${API_BASE_URL}/chart`, {
          params: { symbol: searchSymbol.trim().toUpperCase(), market, tf: timeframe }
        });
        data = response.data;
      }
      
      console.log("Search response:", data);
      
              if (data.signals) {
          // ChartResponse'dan ScanItem formatına çevir
          const scanItem: ScanItem = {
            symbol: searchSymbol.trim().toUpperCase(),
            market: market,
            score: data.signals.score || 0,
            category: data.signals.category || "Neutral",
            RL: data.levels?.RL || 0,
            VAL: data.levels?.VAL || 0,
            RH: data.levels?.RH || 0,
            H: data.levels?.H || 0,
            ATR: data.signals.ATR || 0,
            volRatio: data.signals.volRatio || 0,
            close: data.signals.close || 0,
            isDCA: data.signals.isDCA || false,
            isDipReclaim: data.signals.isDipReclaim || false,
            isNearBreakout: data.signals.isNearBreakout || false,
            isBreakout: data.signals.isBreakout || false,
            ema20: data.signals.ema20 || 0,
            ema50: data.signals.ema50 || 0,
            avwap: data.signals.avwap || 0,
            // Yeni DCA algoritması için ek alanlar
            score_details: data.signals.score_details,
            range_pct: data.signals.range_pct,
            // Pine Script hedef bantları
            targets: data.signals.targets
          };
          setSearchResult(scanItem);
          
          // Arama sonucunda detay panelini otomatik olarak göster
          const { setSelected } = useAppStore.getState();
          setSelected(scanItem);
          
          // Arama sonrası ekranı üstte tut
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (data.error) {
          setError(data.error);
        } else {
          setError("Sembol bulunamadı veya veri alınamadı");
        }
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.response?.data?.error || "Arama sırasında hata oluştu");
    } finally {
      setSearchLoading(false);
    }
  }

  // Sembol seçme fonksiyonu
  function selectSymbol(symbol: string) {
    setSearchSymbol(symbol);
    setShowSuggestions(false);
    // searchForSymbol(); // Otomatik olarak arama yap - KALDIRILDI
  }

  // Kategorilere ayır
  const nearBreakout = items.filter(x => x.category === "Near-Breakout");
  const dipReclaim = items.filter(x => x.category === "Dip-Reclaim");
  const dca = items.filter(x => x.category === "DCA");
  const breakout = items.filter(x => x.category === "Breakout");

  return (
    <div className="mt-4 sm:mt-6">
      {/* Tarama Kontrolleri */}
      <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
          <button
            onClick={runScan}
            disabled={loading}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Taranıyor...</span>
              </div>
            ) : (
              <span>🔍 DCA Taraması Başlat</span>
            )}
          </button>
          
          {items.length > 0 && (
            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              Son tarama: {scanCount} kez • {items.length} sonuç bulundu
            </div>
          )}
        </div>

        {/* Arama Kutusu */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              value={searchSymbol}
              onChange={(e) => {
                const value = e.target.value;
                setSearchSymbol(value);
                // Type-ahead search tetikle
                if (market === "bist" || market === "crypto") {
                  fetchSearchSuggestions(value);
                }
              }}
              placeholder={`${market.toUpperCase()} sembolü ara (örn: ${market === "crypto" ? "BTCUSDT" : market === "bist" ? "THYAO" : "AAPL"})`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === "Enter" && searchForSymbol()}
              onFocus={() => {
                if (searchSymbol.trim() && (market === "bist" || market === "crypto")) {
                  fetchSearchSuggestions(searchSymbol);
                }
              }}
              onBlur={() => {
                // Biraz gecikme ile önerileri gizle (tıklama için)
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />
            
            {/* Type-ahead suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {suggestionsLoading ? (
                  <div className="p-3 text-center text-gray-500">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Aranıyor...</span>
                  </div>
                ) : (
                  searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => selectSymbol(suggestion.symbol)}
                      className="w-full text-left p-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-gray-800">{suggestion.symbol}</div>
                      <div className="text-xs text-gray-600 truncate">{suggestion.name}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            onClick={searchForSymbol}
            disabled={searchLoading || !searchSymbol.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
              searchLoading || !searchSymbol.trim()
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {searchLoading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Aranıyor...</span>
              </div>
            ) : (
              <span>🔍 Ara</span>
            )}
          </button>
        </div>
        
        {error && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
            <strong>Hata:</strong> {error}
          </div>
        )}
      </div>

                {/* Arama Sonucu */}
          {searchResult && (
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-center text-green-700">
                  🔍 Arama Sonucu: {searchResult.symbol}
                </h3>
                <p className="text-center text-sm text-gray-600 mt-1">
                  Detaylar otomatik olarak yükleniyor...
                </p>
              </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{Math.round(searchResult.score)}</div>
              <div className="text-xs text-gray-600">DCA Skoru</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-600">{searchResult.category}</div>
              <div className="text-xs text-gray-600">Kategori</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">{searchResult.close.toFixed(4)}</div>
              <div className="text-xs text-gray-600">Güncel Fiyat</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-700">RL</div>
              <div className="font-mono text-xs">{searchResult.RL.toFixed(4)}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-700">VAL</div>
              <div className="font-mono text-xs">{searchResult.VAL.toFixed(4)}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-700">RH</div>
              <div className="font-mono text-xs">{searchResult.RH.toFixed(4)}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-700">ATR</div>
              <div className="font-mono text-xs">{searchResult.ATR.toFixed(4)}</div>
            </div>
          </div>
          
          {/* ATR ve Volatilite Bilgisi */}
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
              <div className="font-semibold text-orange-700">ATR (14)</div>
              <div className="font-mono text-orange-600 text-lg">{searchResult.ATR.toFixed(4)}</div>
              <div className="text-xs text-orange-500">
                {searchResult.ATR > 0 ? "Volatilite Aktif" : "Volatilite Düşük"}
              </div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
              <div className="font-semibold text-blue-700">Range %</div>
              <div className="font-mono text-blue-600 text-lg">%{searchResult.range_pct?.toFixed(1) || "N/A"}</div>
              <div className="text-xs text-blue-500">
                {(searchResult.range_pct || 0) <= 20 ? "Akümülasyon" : "Yüksek Volatilite"}
              </div>
            </div>
          </div>
          
          {/* DCA Skor Detayları - Pine Script Algoritması */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-3 text-center">
              🎯 DCA Skor Detayları (Pine Script Algoritması)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">1. Akümülasyon:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {searchResult.score_details?.akumulasyon || 0}/20
                  </span>
                </div>
                <div className="text-xs text-gray-500 ml-4 mb-2">
                  Range: {searchResult.score_details?.range_pct || 0}% — 
                  Bant: {searchResult.score_details?.range_width_score || 0}/10 • 
                  Konum: {searchResult.score_details?.range_position_score || 0}/10
                  {searchResult.score_details?.atr_bonus ? ` • ATR Bonus: +${searchResult.score_details.atr_bonus}` : ''}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">2. Spring (Fitil):</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {searchResult.score_details?.spring || 0}/15
                  </span>
                </div>
                {/* Spring Detaylı Puanlama */}
                <div className="text-xs text-gray-500 ml-4 mb-2">
                  Fitil/Gövde: {searchResult.score_details?.spring_wick_score || 0}/7 • 
                  Pozisyon: {searchResult.score_details?.spring_pos_score || 0}/4 • 
                  Destek: {searchResult.score_details?.spring_support_score || 0}/4 • 
                  Hacim: +{searchResult.score_details?.spring_vol_bonus || 0}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">3. OBV Yukarı:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {searchResult.score_details?.obv || 0}/15
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">4. Akıllı Hacim:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {searchResult.score_details?.hacim || 0}/10
                  </span>
                </div>
                {searchResult.score_details?.volume_score !== undefined && (
                  <div className="text-xs text-gray-500 ml-4 mb-2">
                    Kuruma: {searchResult.score_details.dry_up_score || 0}/3 • 
                    Spring: {searchResult.score_details.spring_volume_score || 0}/3 • 
                    Breakout: {searchResult.score_details.breakout_volume_score || 0}/3
                    {searchResult.score_details.churn_penalty && searchResult.score_details.churn_penalty < 0 ? 
                      ` • Churn: ${searchResult.score_details.churn_penalty}` : ''}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">5. Breakout Yakın:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {searchResult.score_details?.breakout_yakin || 0}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">6. EMA Kesişim:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {searchResult.score_details?.ema_kesisim || 0}/10
                  </span>
                </div>
                {searchResult.score_details?.golden_cross_bonus !== undefined && (
                  <div className="text-xs text-gray-500 ml-4 mb-2">
                    Golden Cross Bonus: +{searchResult.score_details.golden_cross_bonus}/+2
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">7. RSI Toparlanma:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {searchResult.score_details?.rsi_toparlanma || 0}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">8. ATR Volatilite:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {searchResult.score_details?.atr || 0}/10
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-gray-800 font-semibold">TOPLAM:</span>
                  <span className="font-mono font-bold text-blue-800 text-lg">
                    {Math.round(searchResult.score)}/100
                  </span>
                </div>
              </div>
            </div>
            
            {/* Range Bilgisi - Pine Script Algoritması */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Range Oynama:</span>
                <span className="font-mono font-semibold text-blue-600">
                  %{searchResult.range_pct?.toFixed(1) || "N/A"}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {(searchResult.range_pct || 0) <= 20 ? "✅ Akümülasyon bölgesi (≤%20)" : "❌ Yüksek volatilite (>%20)"}
              </div>
            </div>
            
            {/* Pine Script Hedef Bantları */}
            {searchResult.targets && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <h5 className="text-xs font-semibold text-blue-800 mb-2 text-center">
                  🎯 Take Profit Hedefleri (Pine Script)
                </h5>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                    <div className="font-semibold text-green-700">{searchResult.targets.T1.label}</div>
                    <div className="font-mono text-green-600">
                      {searchResult.targets.T1.from.toFixed(2)} - {searchResult.targets.T1.to.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                    <div className="font-semibold text-yellow-700">{searchResult.targets.T2.label}</div>
                    <div className="font-mono text-yellow-600">
                      {searchResult.targets.T2.from.toFixed(2)} - {searchResult.targets.T2.to.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                    <div className="font-semibold text-red-700">{searchResult.targets.T3.label}</div>
                    <div className="font-mono text-red-600">
                      {searchResult.targets.T3.from.toFixed(2)} - {searchResult.targets.T3.to.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Pine Script Algoritma Bilgisi */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="text-xs text-blue-700 text-center">
                📊 <strong>Pine Script Algoritması:</strong> Spring bonus (5p), EMA bonus (6p), Range ≤%20, ATR volatilite (10p)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sonuçlar */}
      {items.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          <Section 
            title="🚀 Near-Breakout (Kırılmaya En Yakın)" 
            items={nearBreakout} 
            color="bg-blue-600"
          />
          
          <Section 
            title="💜 Dip-Reclaim (Spring/Manipüle)" 
            items={dipReclaim} 
            color="bg-purple-600"
          />
          
          <Section 
            title="📈 Breakout (Kırılım Gerçekleşti)" 
            items={breakout} 
            color="bg-red-600"
          />
          
          <Section 
            title="💰 DCA (Toplama Alanı)" 
            items={dca} 
            color="bg-green-600"
          />
        </div>
      )}

      {/* Boş Durum */}
      {!loading && items.length === 0 && !error && (
        <div className="text-center py-8 sm:py-12 text-gray-500">
          <div className="text-4xl sm:text-6xl mb-4">🔍</div>
          <h3 className="text-lg sm:text-xl font-medium mb-2">Tarama Başlatın</h3>
          <p className="text-xs sm:text-sm">Yukarıdaki butona tıklayarak DCA taramasını başlatın</p>
        </div>
      )}
      
      {/* DCA Skor Puanlama Tablosu */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          📊 DCA Skor Puanlama Sistemi
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-50 border-b border-blue-200">
                <th className="px-4 py-3 text-left font-semibold text-blue-800">DCA Skoru</th>
                <th className="px-4 py-3 text-left font-semibold text-blue-800">Kategori Adı</th>
                <th className="px-4 py-3 text-left font-semibold text-blue-800">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-red-50">
                <td className="px-4 py-3 font-mono font-semibold text-red-600">0 – 29</td>
                <td className="px-4 py-3 font-medium text-red-700">Weak (Zayıf)</td>
                <td className="px-4 py-3 text-gray-700">Akümülasyon sinyalleri zayıf, teknik uyum az, risk yüksek.</td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-yellow-50">
                <td className="px-4 py-3 font-mono font-semibold text-yellow-600">30 – 49</td>
                <td className="px-4 py-3 font-medium text-yellow-700">Neutral (Nötr)</td>
                <td className="px-4 py-3 text-gray-700">Ne güçlü alım ne de net satım sinyali, izleme aşaması.</td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-blue-50">
                <td className="px-4 py-3 font-mono font-semibold text-blue-600">50 – 69</td>
                <td className="px-4 py-3 font-medium text-blue-700">DCA</td>
                <td className="px-4 py-3 text-gray-700">Temel akümülasyon sinyalleri var, kademeli alım yapılabilir.</td>
              </tr>
              <tr className="border-b border-gray-200 hover:bg-green-50">
                <td className="px-4 py-3 font-mono font-semibold text-green-600">70 – 84</td>
                <td className="px-4 py-3 font-medium text-green-700">DCA Strong</td>
                <td className="px-4 py-3 text-gray-700">Birçok kriter tam puana yakın, güçlü akümülasyon bölgesi.</td>
              </tr>
              <tr className="hover:bg-emerald-50">
                <td className="px-4 py-3 font-mono font-semibold text-emerald-600">85 – 100</td>
                <td className="px-4 py-3 font-medium text-emerald-700">Strong Buy</td>
                <td className="px-4 py-3 text-gray-700">Neredeyse tüm sinyaller maksimum uyumda, agresif alım seviyesi.</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-xs text-gray-600 text-center">
          💡 Bu puanlama sistemi Pine Script algoritması ve ATR volatilite analizi kullanılarak hesaplanır.
        </div>
        
        {/* Akıllı Range (Akümülasyon) Puanlama Detayı */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-3 text-center">
            🧠 Akıllı Range (Akümülasyon) Puanlama Sistemi
          </h4>
          <div className="grid grid-cols-1 gap-3 text-xs">
            {/* Bant Genişliği Puanı */}
            <div className="p-3 bg-blue-100 rounded border border-blue-200">
              <div className="font-semibold text-blue-800 mb-2">📏 Bant Genişliği (0-10 puan)</div>
              <div className="grid grid-cols-1 gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">≤ %10:</span>
                  <span className="font-semibold text-green-600">10/10 – Çok dar bant</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">%10 – %15:</span>
                  <span className="font-semibold text-blue-600">7/10 – Dar bant</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">%15 – %20:</span>
                  <span className="font-semibold text-yellow-600">4/10 – Orta bant</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">&gt; %20:</span>
                  <span className="font-semibold text-red-600">0/10 – Geniş bant</span>
                </div>
              </div>
            </div>

            {/* Range İçi Konum Puanı */}
            <div className="p-3 bg-indigo-100 rounded border border-indigo-200">
              <div className="font-semibold text-indigo-800 mb-2">📍 Range İçi Konum (0-10 puan)</div>
              <div className="grid grid-cols-1 gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700">RL'ye yakın (≤%3):</span>
                  <span className="font-semibold text-teal-600">7/10 – Destek testi</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700">RH'ye yakın (≤%3):</span>
                  <span className="font-semibold text-orange-600">5/10 – Kırılım öncesi</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700">VAL etrafında (≤%2):</span>
                  <span className="font-semibold text-purple-600">3/10 – Denge bölgesi</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700">ATR Bonus (≤%2):</span>
                  <span className="font-semibold text-emerald-600">+1 puan – Düşük volatilite</span>
                </div>
                <div className="text-xs text-indigo-600 mt-1">
                  💡 Birden fazla konum tutarsa puanlar toplanır (maks 10)
                </div>
              </div>
            </div>

            {/* Toplam Puan Açıklaması */}
            <div className="p-3 bg-emerald-100 rounded border border-emerald-200">
              <div className="font-semibold text-emerald-800 mb-2">🎯 Toplam Akümülasyon Skoru (0-20)</div>
              <div className="text-xs text-emerald-700">
                <div className="mb-1">• <strong>17-20:</strong> Dar bant + RL yakınlığı = Güçlü alım sinyali</div>
                <div className="mb-1">• <strong>13-16:</strong> Dar bant + VAL etrafında = Orta güçte sinyal</div>
                <div className="mb-1">• <strong>9-12:</strong> Orta bant + RH yakınlığı = Kırılım öncesi</div>
                <div className="mb-1">• <strong>0-8:</strong> Geniş bant veya uygun konum yok</div>
              </div>
            </div>
          </div>
        </div>

        {/* Spring (Fitil) Detaylı Puanlama */}
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="text-sm font-semibold text-green-800 mb-3 text-center">
            🍃 Spring (Fitil) Detaylı Puanlama (0-15)
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-green-700">Fitil Boyu / Mum Gövdesi Oranı:</span>
              <span className="font-semibold text-blue-600">0-7 puan</span>
            </div>
            <div className="text-xs text-green-600 ml-4 mb-1">
              Fitil boyu gövdenin en az %50'si ise + güçlü alım tepkisi
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-700">Fitilin Pozisyonu:</span>
              <span className="font-semibold text-blue-600">0-4 puan</span>
            </div>
            <div className="text-xs text-green-600 ml-4 mb-1">
              Alt fitil → Düşüşten güçlü dönüş sinyali
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-700">Destek Seviyesi Yakınlığı:</span>
              <span className="font-semibold text-blue-600">0-4 puan</span>
            </div>
            <div className="text-xs text-green-600 ml-4 mb-1">
              Fitil, önemli destek seviyesine (%1-%2 yakınlık) temas etmişse
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-700">Hacim Bonusu:</span>
              <span className="font-semibold text-emerald-600">+1 puan</span>
            </div>
            <div className="text-xs text-green-600 ml-4 mb-1">
              Spring barında hacim artışı varsa ekstra puan
            </div>
          </div>
        </div>

        {/* Akıllı Hacim Puanlama Sistemi */}
        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="text-sm font-semibold text-purple-800 mb-3 text-center">
            📊 Akıllı Hacim Puanlama Sistemi (0-10)
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-purple-700">Kuruma (Drying Up):</span>
              <span className="font-semibold text-blue-600">0-3 puan</span>
            </div>
            <div className="text-xs text-purple-600 ml-4 mb-1">
              vma20 ≤ 0.8×vma50 → 3p, ≤0.9× → 1.5p, aksi 0p
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-700">Spring Hacmi:</span>
              <span className="font-semibold text-blue-600">0-3 puan</span>
            </div>
            <div className="text-xs text-purple-600 ml-4 mb-1">
              Spring barında v ≥ 1.5×vma20 → 3p, ≥1.2× → 1.5p
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-700">Kırılım Hacmi:</span>
              <span className="font-semibold text-blue-600">0-3 puan</span>
            </div>
            <div className="text-xs text-purple-600 ml-4 mb-1">
              Breakout/near ve v ≥ 1.8×vma20 → 3p, ≥1.3× → 1.5p
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-700">Churn Cezası:</span>
              <span className="font-semibold text-red-600">0 to -1 puan</span>
            </div>
            <div className="text-xs text-purple-600 ml-4 mb-1">
              v ≥ 1.5×vma20 ve spread ≤ 0.6×ATR → -1p
            </div>
            <div className="text-xs text-purple-600 mt-2 p-2 bg-purple-100 rounded">
              💡 <strong>Toplam:</strong> max(0, min(10, kuruma + spring + kırılım + churn))
            </div>
          </div>
        </div>

        {/* Golden Cross Bonus Açıklaması */}
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="text-sm font-semibold text-amber-800 mb-3 text-center">
            🏆 EMA20-EMA50 Golden Cross Bonus (+2)
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-amber-700">Son 10 Bar İçinde Kesişim:</span>
              <span className="font-semibold text-blue-600">ta.crossover(ema20, ema50) ≤ 10</span>
            </div>
            <div className="text-xs text-amber-600 ml-4 mb-1">
              EMA20 son 10 bar içinde EMA50'yi yukarı kesmiş
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-700">Spread Artışı:</span>
              <span className="font-semibold text-blue-600">(ema20 - ema50) {'>'}(ema20[1] - ema50[1])</span>
            </div>
            <div className="text-xs text-amber-600 ml-4 mb-1">
              Momentum teyidi - spread artıyor
            </div>
            <div className="text-xs text-amber-600 mt-2 p-2 bg-amber-100 rounded">
              💡 <strong>Bonus:</strong> Her iki koşul sağlanırsa +2 puan (EMA kesişim puanına eklenir)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
