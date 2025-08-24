import { useState, useEffect } from "react";
import axios from "axios";
import { useAppStore } from "../store";
import { WatchlistItem } from "../types";
import LoadingSpinner from "./LoadingSpinner";

export default function WatchlistPanel() {
  // Backend URL - Production'da environment variable kullan
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8014';
  
  const { 
    watchlist, 
    setWatchlist, 
    watchlistLoading, 
    setWatchlistLoading,
    removeFromWatchlist,
    updateWatchlistItem 
  } = useAppStore();
  
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ target_price: "", notes: "" });

  // Takip listesini yükle
  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setWatchlistLoading(true);
      const response = await axios.get(`${API_BASE_URL}/watchlist`);
      if (response.data.success) {
        setWatchlist(response.data.watchlist);
      }
    } catch (error: any) {
      console.error("Takip listesi yükleme hatası:", error);
    } finally {
      setWatchlistLoading(false);
    }
  };

  // Fiyatları güncelle
  const handleUpdatePrices = async () => {
    try {
      setUpdatingPrices(true);
      const response = await axios.post(`${API_BASE_URL}/watchlist/update-prices`);
      if (response.data.success) {
        setWatchlist(response.data.watchlist);
      }
    } catch (error: any) {
      console.error("Fiyat güncelleme hatası:", error);
    } finally {
      setUpdatingPrices(false);
    }
  };

  // Takip listesinden kaldır
  const handleRemoveFromWatchlist = async (id: string) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/watchlist/${id}`);
      if (response.data.success) {
        removeFromWatchlist(id);
      }
    } catch (error: any) {
      console.error("Takip listesinden kaldırma hatası:", error);
    }
  };

  // Düzenleme modunu aç
  const handleEdit = (item: WatchlistItem) => {
    setEditingItem(item.id);
    setEditForm({
      target_price: item.target_price?.toString() || "",
      notes: item.notes || ""
    });
  };

  // Düzenlemeyi kaydet
  const handleSaveEdit = async (id: string) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/watchlist/${id}`, {
        target_price: editForm.target_price ? parseFloat(editForm.target_price) : null,
        notes: editForm.notes || null
      });
      
      if (response.data.success) {
        updateWatchlistItem(id, response.data.item);
        setEditingItem(null);
        setEditForm({ target_price: "", notes: "" });
      }
    } catch (error: any) {
      console.error("Güncelleme hatası:", error);
    }
  };

  // Düzenlemeyi iptal et
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({ target_price: "", notes: "" });
  };

  // Kar/zarar hesapla
  const calculateProfitLoss = (item: WatchlistItem) => {
    if (!item.current_price || !item.target_price) return null;
    const diff = item.current_price - item.target_price;
    const percent = (diff / item.target_price) * 100;
    return { diff, percent };
  };

  // Para formatı
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Yüzde formatı
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (watchlistLoading) {
    return (
      <div className="mt-4 sm:mt-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Takip listesi yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 sm:mt-6">
      {/* Başlık ve Kontroller */}
      <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">📋 Takip Listesi</h2>
            <p className="text-sm text-gray-600 mt-1">
              {watchlist.length} sembol takip ediliyor
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdatePrices}
              disabled={updatingPrices || watchlist.length === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                updatingPrices || watchlist.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
              }`}
            >
              {updatingPrices ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Güncelleniyor...</span>
                </div>
              ) : (
                <span>🔄 Fiyatları Güncelle</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Takip Listesi Tablosu */}
      {watchlist.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">Takip Listesi Boş</h3>
          <p className="text-sm text-gray-500">
            Scanner sekmesinden bir sembol analiz edip "Takip Listesine Ekle" butonuna tıklayarak takip listesine ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SEMBOL
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GÜNCEL FİYAT
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HEDEF FİYAT
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KAR/ZARAR
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    EKLENME TARİHİ
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NOTLAR
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İŞLEMLER
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {watchlist.map((item) => {
                  const profitLoss = calculateProfitLoss(item);
                  const isEditing = editingItem === item.id;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.symbol} ({item.market})
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.current_price ? formatCurrency(item.current_price) : "—"}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.target_price}
                            onChange={(e) => setEditForm({ ...editForm, target_price: e.target.value })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="0.00"
                          />
                        ) : (
                          item.target_price ? formatCurrency(item.target_price) : "—"
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm">
                        {profitLoss ? (
                          <div>
                            <div className={`font-medium ${profitLoss.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(profitLoss.diff)}
                            </div>
                            <div className={`text-xs ${profitLoss.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(profitLoss.percent)}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.added_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Not ekle..."
                          />
                        ) : (
                          item.notes || "—"
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Kaydet
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                            >
                              İptal
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleRemoveFromWatchlist(item.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              Kaldır
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
