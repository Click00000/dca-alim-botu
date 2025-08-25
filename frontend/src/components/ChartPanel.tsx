import { useState } from "react";
import axios from "axios";
import { useAppStore } from "../store";


export default function ChartPanel() {
  // Backend URL - Production'da sabit URL kullan
  const API_BASE_URL = 'https://dca-scanner-backend.onrender.com';
  
  const { selected, setSelected, watchlist, addToWatchlist } = useAppStore();
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);

  if (!selected) return null;

  // Takip listesinde var mı kontrol et
  const isInWatchlist = watchlist.some(item => 
    item.symbol === selected.symbol && item.market === selected.market
  );

  // Takip listesine ekle
  const handleAddToWatchlist = async () => {
    if (isInWatchlist) return;
    
    try {
      setAddingToWatchlist(true);
      
      const response = await axios.post(`${API_BASE_URL}/watchlist/add`, {
        symbol: selected.symbol,
        market: selected.market,
        target_price: null,
        notes: null
      });
      
      if (response.data.success) {
        addToWatchlist(response.data.item);
      }
    } catch (error: any) {
      console.error("Takip listesine ekleme hatası:", error);
    } finally {
      setAddingToWatchlist(false);
    }
  };

  return (
    <div className="mt-4 sm:mt-6">
      {/* Başlık */}
      <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{selected.symbol}</h2>
            <p className="text-sm sm:text-base text-gray-600 capitalize">{selected.market} • {selected.category}</p>
          </div>
          <div className="flex gap-2 self-center sm:self-auto">
            <button
              onClick={handleAddToWatchlist}
              disabled={isInWatchlist || addingToWatchlist}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm ${
                isInWatchlist 
                  ? "bg-green-100 text-green-700 cursor-not-allowed" 
                  : addingToWatchlist
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isInWatchlist ? "✓ Takip Listesinde" : addingToWatchlist ? "Ekleniyor..." : "📋 Takip Listesine Ekle"}
            </button>
            <button
              onClick={() => setSelected(undefined)}
              className="px-3 sm:px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              ✕ Kapat
            </button>
          </div>
        </div>
      </div>

      {/* Ana İçerik Grid */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Sol Taraf - Temel Bilgiler */}
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">📊 Temel Bilgiler</h3>
          
          {/* Skor */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="text-center">
              <div className={`text-2xl sm:text-3xl font-bold ${
                selected.score >= 80 ? "text-green-600" :
                selected.score >= 60 ? "text-yellow-600" :
                "text-gray-600"
              }`}>
                {Math.round(selected.score)}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">DCA Skoru (0-100)</div>
            </div>
          </div>

          {/* Temel Metrikler */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <h4 className="font-medium text-gray-800 text-sm sm:text-base">📊 Temel Metrikler</h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Close:</span>
                <span className="font-mono font-medium">{selected.close.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ATR14:</span>
                <span className="font-mono font-medium">{selected.ATR.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vol Ratio:</span>
                <span className="font-mono font-medium">{(selected.volRatio * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Seviyeler */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <h4 className="font-medium text-gray-800 text-sm sm:text-base">🎯 Ana Seviyeler</h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">RL (Support):</span>
                <span className="font-mono font-medium text-blue-600">{selected.RL.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAL:</span>
                <span className="font-mono font-medium text-amber-600">{selected.VAL.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">RH (Resistance):</span>
                <span className="font-mono font-medium text-red-600">{selected.RH.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Taraf - DCA Skor Detayları */}
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">🎯 DCA Skor Detayları</h3>
          
          {/* DCA Skor Detayları - Pine Script Algoritması */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-3 text-center">
              🎯 DCA Skor Detayları (Pine Script Algoritması)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">1. Akümülasyon:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {selected.score_details?.akumulasyon || 0}/20
                  </span>
                </div>
                <div className="text-xs text-gray-500 ml-4 mb-2">
                  Range: {selected.score_details?.range_pct || 0}% — 
                  Bant: {selected.score_details?.range_width_score || 0}/10 • 
                  Konum: {selected.score_details?.range_position_score || 0}/10
                  {selected.score_details?.atr_bonus ? ` • ATR Bonus: +${selected.score_details.atr_bonus}` : ''}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">2. Spring (Fitil):</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {selected.score_details?.spring || 0}/15
                  </span>
                </div>
                {/* Spring Detaylı Puanlama */}
                <div className="text-xs text-gray-500 ml-4 mb-2">
                  Fitil/Gövde: {selected.score_details?.spring_wick_score || 0}/7 • 
                  Pozisyon: {selected.score_details?.spring_pos_score || 0}/4 • 
                  Destek: {selected.score_details?.spring_support_score || 0}/4 • 
                  Hacim: +{selected.score_details?.spring_vol_bonus || 0}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">3. OBV Yukarı:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {selected.score_details?.obv || 0}/15
                  </span>
                </div>
                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">4. Akıllı Hacim:</span>
                <span className="font-mono font-semibold text-blue-600">
                  {selected.score_details?.hacim || 0}/10
                </span>
                {selected.score_details?.volume_score !== undefined && (
                  <div className="text-xs text-gray-500 ml-4 mb-2">
                    Kuruma: {selected.score_details.dry_up_score || 0}/3 • 
                    Spring: {selected.score_details.spring_volume_score || 0}/3 • 
                    Breakout: {selected.score_details.breakout_volume_score || 0}/3
                    {selected.score_details.churn_penalty && selected.score_details.churn_penalty < 0 ? 
                      ` • Churn: ${selected.score_details.churn_penalty}` : ''}
                  </div>
                )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">5. Breakout Yakın:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {selected.score_details?.breakout_yakin || 0}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">6. EMA Kesişim:</span>
                <span className="font-mono font-semibold text-blue-600">
                  {selected.score_details?.ema_kesisim || 0}/10
                </span>
                {selected.score_details?.golden_cross_bonus !== undefined && (
                  <div className="text-xs text-gray-500 ml-4 mb-2">
                    Golden Cross Bonus: +{selected.score_details.golden_cross_bonus}/+2
                  </div>
                )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">7. RSI Toparlanma:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {selected.score_details?.rsi_toparlanma || 0}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">8. ATR Volatilite:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {selected.score_details?.atr || 0}/10
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-gray-800 font-semibold">TOPLAM:</span>
                  <span className="font-mono font-bold text-blue-800 text-lg">
                    {Math.round(selected.score)}/100
                  </span>
                </div>
              </div>
            </div>
            
            {/* Range Bilgisi - Pine Script Algoritması */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Range Oynama:</span>
                <span className="font-mono font-semibold text-blue-600">
                  %{selected.range_pct?.toFixed(1) || "N/A"}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {(selected.range_pct || 0) <= 20 ? "✅ Akümülasyon bölgesi (≤%20)" : "❌ Yüksek volatilite (>%20)"}
              </div>
            </div>
            
            {/* Pine Script Hedef Bantları */}
            {selected.targets && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <h5 className="text-xs font-semibold text-blue-800 mb-2 text-center">
                  🎯 Take Profit Hedefleri (Pine Script)
                </h5>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                    <div className="font-semibold text-green-700">{selected.targets.T1.label}</div>
                    <div className="font-mono text-green-600">
                      {selected.targets.T1.from.toFixed(2)} - {selected.targets.T1.to.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                    <div className="font-semibold text-yellow-700">{selected.targets.T2.label}</div>
                    <div className="font-mono text-yellow-600">
                      {selected.targets.T2.from.toFixed(2)} - {selected.targets.T2.to.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                    <div className="font-semibold text-red-700">{selected.targets.T3.label}</div>
                    <div className="font-mono text-red-600">
                      {selected.targets.T3.from.toFixed(2)} - {selected.targets.T3.to.toFixed(2)}
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
      </div>
      
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
                  <span className="text-blue-700">{'>'} %20:</span>
                  <span className="font-semibold text-red-600">0/10 – Geniş bant</span>
                </div>
              </div>
            </div>

            {/* Range İçi Konum Puanı */}
            <div className="p-3 bg-indigo-100 rounded border border-indigo-200">
              <div className="font-semibold text-indigo-800 mb-2">📍 Range İçi Konum (0-10 puan)</div>
              <div className="grid grid-cols-1 gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">RL'ye yakın (≤%3):</span>
                  <span className="font-semibold text-teal-600">7/10 – Destek testi</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">RH'ye yakın (≤%3):</span>
                  <span className="font-semibold text-orange-600">5/10 – Kırılım öncesi</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">VAL etrafında (≤%2):</span>
                  <span className="font-semibold text-purple-600">3/10 – Denge bölgesi</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">ATR Bonus (≤%2):</span>
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
      </div>
    </div>
  );
}
