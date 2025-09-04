import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';

import { PortfolioItem, PortfolioPosition, PortfolioSummary, PortfolioAddRequest } from '../types';
import { api } from '../lib/api';

// Chart.js bileşenlerini kaydet
ChartJS.register(ArcElement, Tooltip, Legend, Title);

export default function PortfolioPanel() {
  // Debug: API instance'ı console'a yazdır
  console.log('🔍 DEBUG: API Instance baseURL =', api.defaults.baseURL);
  

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newItem, setNewItem] = useState<PortfolioAddRequest>({
    symbol: '',
    market: 'bist',
    transaction_type: 'buy',
    price: 0,
    quantity: 0,
    target_price: 0,
    notes: '',
    portfolio_id: '',
    // manuel tarih alanı (ISO string)
    date: ''
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingItems, setEditingItems] = useState<Set<string>>(new Set());
  const [editFormData, setEditFormData] = useState<{[key: string]: any}>({});

  // Portföy yönetimi state'leri
  const [portfolios, setPortfolios] = useState<Array<{portfolio_id: string, portfolio_name: string, portfolio_description?: string}>>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({name: '', description: ''});

  // Sıralama state'leri
  const [positionsSortConfig, setPositionsSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [portfolioSortConfig, setPortfolioSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Hisse arama state'leri
  const [symbolSuggestions, setSymbolSuggestions] = useState<Array<{symbol: string, name: string}>>([]);
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);
  const [symbolSuggestionsLoading, setSymbolSuggestionsLoading] = useState(false);

  // Sıralama fonksiyonu
  const sortData = <T extends Record<string, any>>(
    data: T[],
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null
  ): T[] => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Sayısal değerler için özel işlem
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (sortConfig.direction === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }

      // Tarih değerleri için özel işlem
      if (aValue instanceof Date && bValue instanceof Date) {
        if (sortConfig.direction === 'asc') {
          return aValue.getTime() - bValue.getTime();
        } else {
          return bValue.getTime() - aValue.getTime();
        }
      }

      // String değerler için
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Pasta grafik state'leri
  const [showCharts, setShowCharts] = useState(true);
  const [chartType, setChartType] = useState<'allocation' | 'profit_loss'>('allocation');

  // Pasta grafik verilerini hazırla
  const prepareChartData = () => {
    if (!positions || positions.length === 0) return null;

    if (chartType === 'allocation') {
      // Portföy dağılımı grafiği
      const labels = positions.map(pos => pos.symbol);
      const data = positions.map(pos => {
        const price = (pos.current_price ?? pos.avg_price ?? 0);
        const value = (price * pos.total_quantity) || pos.total_cost || 0;
        return value;
      });
      const total = data.reduce((a, b) => a + (b || 0), 0);
      if (total <= 0) return null;
      const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
      ];

      return {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(color => color + '80'),
          borderWidth: 2,
        }]
      };
    } else {
      // Kar/zarar dağılımı grafiği
      const profitable = positions.filter(pos => pos.profit_loss > 0);
      const lossMaking = positions.filter(pos => pos.profit_loss < 0);
      const neutral = positions.filter(pos => pos.profit_loss === 0);

      const labels = ['Karlı Pozisyonlar', 'Zararlı Pozisyonlar', 'Nötr Pozisyonlar'];
      const data = [
        profitable.reduce((sum, pos) => sum + Math.abs(pos.profit_loss), 0),
        lossMaking.reduce((sum, pos) => sum + Math.abs(pos.profit_loss), 0),
        neutral.reduce((sum, pos) => sum + Math.abs(pos.profit_loss), 0)
      ];
      const total = data.reduce((a, b) => a + (b || 0), 0);
      if (total <= 0) return null;

      return {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#10B981', '#EF4444', '#6B7280'],
          borderColor: ['#10B98180', '#EF444480', '#6B728080'],
          borderWidth: 2,
        }]
      };
    }
  };

  // Sıralama handler'ı
  const handleSort = (
    key: string,
    setSortConfig: React.Dispatch<React.SetStateAction<{ key: string; direction: 'asc' | 'desc' } | null>>
  ) => {
    setSortConfig(currentConfig => {
      if (currentConfig && currentConfig.key === key) {
        // Aynı kolona tıklandığında yön değiştir
        return {
          key,
          direction: currentConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // Yeni kolona tıklandığında ascending ile başla
        return { key, direction: 'asc' };
      }
    });
  };

  // Sıralama ikonu
  const getSortIcon = (key: string, sortConfig: { key: string; direction: 'asc' | 'desc' } | null) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-blue-600">↑</span> : 
      <span className="text-blue-600">↓</span>;
  };

  // Pozisyonlar için özel sıralama (kar/zarar hesaplamaları dahil)
  const getSortedPositions = () => {
    if (!positionsSortConfig) return positions;

    return [...positions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Özel hesaplamalar için
      if (positionsSortConfig.key === 'profit_loss') {
        const aCurrentValue = (a.current_price || 0) * a.total_quantity;
        const bCurrentValue = (b.current_price || 0) * b.total_quantity;
        aValue = aCurrentValue - a.total_cost;
        bValue = bCurrentValue - b.total_cost;
      } else if (positionsSortConfig.key === 'profit_loss_percent') {
        const aCurrentValue = (a.current_price || 0) * a.total_quantity;
        const bCurrentValue = (b.current_price || 0) * b.total_quantity;
        aValue = a.total_cost > 0 ? ((aCurrentValue - a.total_cost) / a.total_cost) * 100 : 0;
        bValue = b.total_cost > 0 ? ((bCurrentValue - b.total_cost) / b.total_cost) * 100 : 0;
      } else if (positionsSortConfig.key === 'target_progress') {
        aValue = a.target_price && a.current_price ? ((a.current_price - a.target_price) / a.target_price) * 100 : 0;
        bValue = b.target_price && b.current_price ? ((b.current_price - b.target_price) / b.target_price) * 100 : 0;
      } else if (positionsSortConfig.key === 'total_value') {
        aValue = (a.current_price || 0) * a.total_quantity;
        bValue = (b.current_price || 0) * b.total_quantity;
      } else if (positionsSortConfig.key === 'total_profit_loss') {
        const aCurrentValue = (a.current_price || 0) * a.total_quantity;
        const bCurrentValue = (b.current_price || 0) * b.total_quantity;
        const aUnrealized = aCurrentValue - a.total_cost;
        const bUnrealized = bCurrentValue - b.total_cost;
        aValue = aUnrealized + (a.realized_profit_loss || 0);
        bValue = bUnrealized + (b.realized_profit_loss || 0);
      } else if (positionsSortConfig.key === 'total_profit_loss_percent') {
        const aCurrentValue = (a.current_price || 0) * a.total_quantity;
        const bCurrentValue = (b.current_price || 0) * b.total_quantity;
        const aUnrealized = aCurrentValue - a.total_cost;
        const bUnrealized = bCurrentValue - b.total_cost;
        const aTotalPL = aUnrealized + (a.realized_profit_loss || 0);
        const bTotalPL = bUnrealized + (b.realized_profit_loss || 0);
        const aTotalInvestment = a.total_cost + Math.abs(a.realized_profit_loss > 0 ? 0 : a.realized_profit_loss);
        const bTotalInvestment = b.total_cost + Math.abs(b.realized_profit_loss > 0 ? 0 : b.realized_profit_loss);
        aValue = aTotalInvestment > 0 ? (aTotalPL / aTotalInvestment) * 100 : 0;
        bValue = bTotalInvestment > 0 ? (bTotalPL / bTotalInvestment) * 100 : 0;
      } else {
        // Normal sıralama
        aValue = a[positionsSortConfig.key as keyof PortfolioPosition];
        bValue = b[positionsSortConfig.key as keyof PortfolioPosition];
      }

      // Sayısal değerler için
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (positionsSortConfig.direction === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }

      // String değerler için
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return positionsSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return positionsSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Zaman dilimi state'i
  const [timeFrame, setTimeFrame] = useState<'G' | 'H' | 'A' | 'All'>('All');

  // Zaman dilimine göre kar/zarar hesaplama
  const getTimeFrameDate = (timeFrame: 'G' | 'H' | 'A' | 'All'): Date | null => {
    const now = new Date();
    switch (timeFrame) {
      case 'G': // Günlük - bugün
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'H': // Haftalık - bu hafta başlangıcı
        const dayOfWeek = now.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Pazartesi başlangıcı
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
      case 'A': // Aylık - bu ay başlangıcı
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'All': // Tüm zamanlar
        return null;
      default:
        return null;
    }
  };

  // Zaman dilimine göre pozisyonları filtrele
  const getFilteredPositions = () => {
    if (timeFrame === 'All') return positions;
    
    const startDate = getTimeFrameDate(timeFrame);
    if (!startDate) return positions;

    return positions.filter(position => {
      // Pozisyonun işlemlerini kontrol et
      const hasTransactionsInPeriod = portfolio.some(item => 
        item.symbol === position.symbol && 
        new Date(item.date) >= startDate
      );
      return hasTransactionsInPeriod;
    });
  };

  // Zaman dilimine göre kar/zarar hesapla
  const getTimeFrameProfitLoss = () => {
    const filteredPositions = getFilteredPositions();
    
    const currentProfitLoss = filteredPositions.reduce((sum, pos) => {
      const currentValue = (pos.current_price || 0) * pos.total_quantity;
      return sum + (currentValue - pos.total_cost);
    }, 0);

    const realizedProfitLoss = filteredPositions.reduce((sum, pos) => 
      sum + (pos.realized_profit_loss || 0), 0
    );

    const totalProfitLoss = currentProfitLoss + realizedProfitLoss;

    return {
      current: currentProfitLoss,
      realized: realizedProfitLoss,
      total: totalProfitLoss
    };
  };

  // Sıralanmış veriler
  const sortedPositions = getSortedPositions();
  const sortedPortfolio = sortData(portfolio, portfolioSortConfig);

  // Hisse arama fonksiyonu
  const fetchSymbolSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSymbolSuggestions([]);
      setShowSymbolSuggestions(false);
      return;
    }
    
    try {
      setSymbolSuggestionsLoading(true);
      
      if (newItem.market === "bist") {
        const response = await api.get('/search-bist', {
          params: { q: query.trim(), limit: 10 }
        });
        
        if (response.data.success && response.data.results) {
          setSymbolSuggestions(response.data.results);
          setShowSymbolSuggestions(true);
        }
      } else if (newItem.market === "crypto") {
        const response = await api.get(`/search-crypto`, {
          params: { q: query.trim(), limit: 10 }
        });
        
        if (response.data.success && response.data.results) {
          setSymbolSuggestions(response.data.results);
          setShowSymbolSuggestions(true);
        }
      }
    } catch (err: any) {
      console.error('Hisse arama hatası:', err);
      setSymbolSuggestions([]);
    } finally {
      setSymbolSuggestionsLoading(false);
    }
  };

  // Hisse seçme fonksiyonu
  const selectSymbol = (symbol: string) => {
    setNewItem({ ...newItem, symbol: symbol.toUpperCase() });
    setShowSymbolSuggestions(false);
  };

  // Portföy listesini yükle
  const loadPortfolios = async () => {
    try {
      console.log('🔍 DEBUG: loadPortfolios başlatıldı');
      
      const apiKey = localStorage.getItem('api_key');
      console.log('🔍 DEBUG: API Key from localStorage:', apiKey);
      
      if (!apiKey) {
        console.error('❌ ERROR: API key bulunamadı! Giriş yapmanız gerekiyor!');
        alert('Giriş yapmanız gerekiyor!');
        return;
      }
      
      console.log('🔍 DEBUG: Making request to portfolio/list with API key:', apiKey.substring(0, 10) + '...');
      
      const response = await api.get('/portfolio/list', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      console.log('🔍 DEBUG: Response status:', response.status);
      console.log('🔍 DEBUG: Response data:', response.data);
      
      if (response.data.success) {
        const backendPortfolios = response.data.portfolios;
        const idMap = response.data.id_map || {};
        
        console.log('🔍 DEBUG: Backend portfolios:', backendPortfolios);
        console.log('🔍 DEBUG: ID map:', idMap);
        
        // Eski seçimi yeniye çevir
        let prevSelected = localStorage.getItem('selectedPortfolioId') || sessionStorage.getItem('selectedPortfolioId') || '';
        if (prevSelected && idMap[prevSelected]) {
          prevSelected = idMap[prevSelected];
        }
        
        // Cache'i temizle
        localStorage.removeItem('selectedPortfolioId');
        sessionStorage.removeItem('selectedPortfolioId');
        
        setPortfolios(backendPortfolios);
        
        // Geçerli önceki seçimi veya ilk portföyü seç
        const validPrev = backendPortfolios.find((p: any) => p.portfolio_id === prevSelected)?.portfolio_id;
        const firstId = backendPortfolios[0]?.portfolio_id;
        
        const selected = validPrev || firstId || '';
        setSelectedPortfolioId(selected);
        
        console.log('🔍 DEBUG: Selected portfolio ID:', selected);
        console.log('🔍 DEBUG: Portfolio names:', backendPortfolios.map((p: any) => p.portfolio_name));
        
        if (selected) {
          localStorage.setItem('selectedPortfolioId', selected);
        }
        
        // LocalStorage'a da kaydet
        localStorage.setItem('portfolios', JSON.stringify(backendPortfolios));
        
        console.log('🔍 DEBUG: loadPortfolios tamamlandı');
      }
    } catch (error: any) {
      console.error('❌ ERROR: Portfolio listesi yüklenemedi:', error);
      console.error('❌ ERROR: Error response:', error.response?.data);
      console.error('❌ ERROR: Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        alert('❌ API Key hatası! Lütfen tekrar giriş yapın.');
        // API key'i temizle ve login sayfasına yönlendir
        localStorage.removeItem('api_key');
        localStorage.removeItem('user');
        window.location.reload();
      }
    }
  };

  // Portföy verilerini yükle
  const loadPortfolio = async () => {
    try {
      // Portfolio ID kontrolü
      if (!selectedPortfolioId || selectedPortfolioId === '') {
        console.log('🔍 DEBUG: Portfolio ID yok, yükleme atlanıyor');
        return;
      }

      console.log('🔍 DEBUG: Portfolio yükleniyor:', selectedPortfolioId);
      setLoading(true);
      
      // API key kontrolü
      const apiKey = localStorage.getItem('api_key');
      if (!apiKey) {
        console.error('Giriş yapmanız gerekiyor!');
        return;
      }
      
      // Seçili portföy ID'sini URL'e ekle
      const portfolioParam = `?portfolio=${selectedPortfolioId}`;
      
      console.log('🔍 DEBUG: Portfolio endpoint çağrılıyor:', `/portfolio${portfolioParam}`);
      
      // Tüm işlemleri yükle
      const response = await api.get(`/portfolio${portfolioParam}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      console.log('🔍 DEBUG: Portfolio response:', response.data);
      
      if (response.data.success) {
        setPortfolio(response.data.portfolio);
        console.log('🔍 DEBUG: Portfolio state güncellendi:', response.data.portfolio);
      } else {
        console.error('❌ ERROR: Portfolio response success false:', response.data);
        setPortfolio([]);
      }
      
      // Gruplandırılmış pozisyonları yükle
      const positionsResponse = await api.get(`/portfolio/positions${portfolioParam}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (positionsResponse.data.success) {
        setPositions(positionsResponse.data.positions);
        console.log('🔍 DEBUG: Positions state güncellendi:', positionsResponse.data.positions);
      } else {
        console.error('❌ ERROR: Positions response success false:', positionsResponse.data);
        setPositions([]);
      }
      
      // Özet bilgileri yükle
      const summaryResponse = await api.get(`/portfolio/summary${portfolioParam}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (summaryResponse.data.success) {
        setSummary(summaryResponse.data.summary);
        console.log('🔍 DEBUG: Summary state güncellendi:', summaryResponse.data.summary);
      } else {
        console.error('❌ ERROR: Summary response success false:', summaryResponse.data);
        setSummary(null);
      }
    } catch (error) {
      console.error('❌ ERROR: Portföy yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pozisyonlar yüklendikten sonra grafik verilerini hazırla
  useEffect(() => {
    if (positions && positions.length > 0) {
      const updatedPositions = positions.map(pos => ({
        ...pos,
        total_value: (pos.current_price || 0) * pos.total_quantity,
        profit_loss: ((pos.current_price || 0) * pos.total_quantity) - pos.total_cost,
        profit_loss_percent: pos.total_cost > 0 ? ((((pos.current_price || 0) * pos.total_quantity) - pos.total_cost) / pos.total_cost) * 100 : 0
      }));
      setPositions(updatedPositions);
    }
  }, [portfolio]); // portfolio değiştiğinde pozisyonları güncelle

  // Fiyatları güncelle
  const updatePrices = async () => {
    try {
      setLoading(true);
      
      // API key kontrolü
      const apiKey = localStorage.getItem('api_key');
      if (!apiKey) {
        console.error('Giriş yapmanız gerekiyor!');
        return;
      }
      
      const response = await api.post(`/portfolio/update-prices?portfolio_id=${selectedPortfolioId}`, {}, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (response.data.success) {
        await loadPortfolio();
      }
    } catch (error) {
      console.error('Fiyatlar güncellenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Excel olarak export et
  const exportToExcel = async () => {
    try {
      setLoading(true);
      
      // API key kontrolü
      const apiKey = localStorage.getItem('api_key');
      if (!apiKey) {
        console.error('Giriş yapmanız gerekiyor!');
        return;
      }
      
      // Excel dosyasını indir
      const response = await api.get(`/portfolio/export-excel?portfolio_id=${selectedPortfolioId}`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      // Dosya adı oluştur
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `portfoy_raporu_${selectedPortfolioId}_${timestamp}.xlsx`;
      
      // Dosyayı indir
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Excel export hatası:', error);
      alert('Excel export sırasında hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  // Yeni işlem ekle
  const addItem = async (newItem: any) => {
    try {
      const apiKey = localStorage.getItem('api_key');
      if (!apiKey) {
        alert('Giriş yapmanız gerekiyor!');
        return;
      }

      // Portfolio seçim guard'ı
      if (!selectedPortfolioId || !portfolios.find((p: any) => p.portfolio_id === selectedPortfolioId)) {
        if (portfolios.length > 0) {
          setSelectedPortfolioId(portfolios[0].portfolio_id);
          alert('Portföy seçimi yenilendi, tekrar deneyin.');
          return;
        } else {
          alert('Portföy bulunamadı!');
          return;
        }
      }

      // Güvenlik: legacy ID yakalandı → listeyi yeniden yükle
      if (!selectedPortfolioId.startsWith("dca")) {
        await loadPortfolios();
        alert('Portföy kimliği güncellendi. Lütfen tekrar deneyin.');
        return;
      }

      const itemWithPortfolio = {
        ...newItem,
        portfolio_id: selectedPortfolioId  // snake_case ZORUNLU
      };

      console.log('DEBUG: selectedPortfolioId:', selectedPortfolioId);
      console.log('DEBUG: newItem:', newItem);
      console.log('DEBUG: itemWithPortfolio:', itemWithPortfolio);

      const response = await api.post(`/portfolio/add`, itemWithPortfolio, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      console.log('DEBUG: Response:', response.data);

      if (response.data.success) {
        // Başarılı ekleme
        setShowAddForm(false);
        setNewItem({
          symbol: '',
          market: 'bist',
          transaction_type: 'buy',
          price: 0,
          quantity: 0,
          target_price: 0,
          notes: '',
          portfolio_id: 'default',
          date: ''
        });
        
        // Portföyü yeniden yükle
        await loadPortfolios();
        await loadPortfolio();
        
        alert('İşlem başarıyla eklendi!');
      } else {
        alert('İşlem eklenirken hata oluştu!');
      }
    } catch (error: any) {
      console.error('İşlem eklenirken hata:', error);
      if (error.response?.data?.detail) {
        alert(`Hata: ${error.response.data.detail}`);
      } else {
        alert('İşlem eklenirken beklenmeyen bir hata oluştu!');
      }
    }
  };

  // Yeni portföy ekle
  const addPortfolio = async () => {
    try {
      const apiKey = localStorage.getItem('api_key');
      if (!apiKey) {
        alert('Giriş yapmanız gerekiyor!');
        return;
      }

      if (!newPortfolio.name.trim()) {
        alert('Portföy adı gerekli!');
        return;
      }

      const response = await api.post(`/portfolio/create`, {
        name: newPortfolio.name,
        description: newPortfolio.description
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.data.success) {
        alert('Portföy başarıyla oluşturuldu!');
        setNewPortfolio({ name: '', description: '' });
        setShowPortfolioForm(false);
        
        // Portfolio listesini yenile
        await loadPortfolios();
        
        // Yeni oluşturulan portföyü seç
        if (response.data.portfolio) {
          setSelectedPortfolioId(response.data.portfolio.portfolio_id);
          localStorage.setItem('selectedPortfolioId', response.data.portfolio.portfolio_id);
        }
      } else {
        alert(`Portföy oluşturulamadı: ${response.data.error}`);
      }
    } catch (error: any) {
      console.error('Portföy oluşturulurken hata:', error);
      alert(`Portföy oluşturulamadı: ${error.response?.data?.error || error.message}`);
    }
  };

  // Portföy sil
  const deletePortfolio = async (portfolioId: string) => {
    try {
      if (portfolioId === 'ana_portfoy') {
        alert('Ana portföy silinemez!');
        return;
      }

      if (!confirm(`"${portfolios.find((p: any) => p.portfolio_id === portfolioId)?.portfolio_name}" portföyünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
        return;
      }

      // API key kontrolü
      const apiKey = localStorage.getItem('api_key');
      if (!apiKey) {
        alert('Giriş yapmanız gerekiyor!');
        return;
      }

      const response = await api.delete(`/portfolio/delete/${portfolioId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.data.success) {
        // Portföy listesini güncelle
        const updatedPortfolios = portfolios.filter((p: any) => p.portfolio_id !== portfolioId);
        setPortfolios(updatedPortfolios);
        localStorage.setItem('portfolios', JSON.stringify(updatedPortfolios));
        
        // Eğer silinen portföy seçiliyse, ilk mevcut portföye geç
        if (selectedPortfolioId === portfolioId) {
          if (updatedPortfolios.length > 0) {
            setSelectedPortfolioId(updatedPortfolios[0].portfolio_id);
                  }
          await loadPortfolio();
        }
        
        alert('Portföy başarıyla silindi!');
      } else {
        alert(response.data.error || 'Portföy silinemedi!');
      }
    } catch (error) {
      console.error('Portföy silinemedi:', error);
      alert('Portföy silinirken hata oluştu!');
    }
  };





  // İşlem sil
  const deleteItem = async (id: string) => {
    if (!confirm('Bu işlemi silmek istediğinizden emin misiniz?')) return;
    
    try {
      setLoading(true);
      // API key kontrolü
      const apiKey = localStorage.getItem('api_key');
      if (!apiKey) {
        alert('Giriş yapmanız gerekiyor!');
        return;
      }
      
      const response = await api.delete(`/portfolios/${id}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (response.data.success) {
        await loadPortfolio();
      }
    } catch (error) {
      console.error('İşlem silinemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Component mount'ta portfolio listesini yükle
  const didFetchPortfolios = useRef(false);
  
  useEffect(() => {
    if (didFetchPortfolios.current) return; // StrictMode'da ikinci çağrıyı blokla
    didFetchPortfolios.current = true;
    
    console.log('🔍 DEBUG: Component mount - loadPortfolios çağrılıyor');
    loadPortfolios();
  }, []); // Boş dependency - sadece bir kez çalışsın

  // Portfolio seçimi değiştiğinde verileri yükle
  useEffect(() => {
    if (selectedPortfolioId && selectedPortfolioId !== 'default') {
      console.log('🔍 DEBUG: Portfolio ID değişti - loadPortfolio çağrılıyor:', selectedPortfolioId);
      loadPortfolio();
      
      // newItem'da portfolio_id'yi güncelle
      setNewItem(prev => ({
        ...prev,
        portfolio_id: selectedPortfolioId
      }));
    }
  }, [selectedPortfolioId]); // Sadece selectedPortfolioId değiştiğinde

  const toggleRowExpansion = (symbol: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(symbol)) {
      newExpandedRows.delete(symbol);
    } else {
      newExpandedRows.add(symbol);
    }
    setExpandedRows(newExpandedRows);
  };

  const toggleEditMode = (itemId: string) => {
    const newEditingItems = new Set(editingItems);
    if (newEditingItems.has(itemId)) {
      newEditingItems.delete(itemId);
      // Cancel edit - remove from editFormData
      const newEditFormData = { ...editFormData };
      delete newEditFormData[itemId];
      setEditFormData(newEditFormData);
    } else {
      newEditingItems.add(itemId);
      // Start edit - initialize form data
      const item = portfolio.find(p => p.id === itemId);
      if (item) {
        setEditFormData({
          ...editFormData,
          [itemId]: {
            transaction_type: item.transaction_type,
            price: item.price,
            quantity: item.quantity,
            target_price: item.target_price,
            notes: item.notes
          }
        });
      }
    }
    setEditingItems(newEditingItems);
  };

  const handleEditChange = (itemId: string, field: string, value: any) => {
    setEditFormData({
      ...editFormData,
      [itemId]: {
        ...editFormData[itemId],
        [field]: value
      }
    });
  };

  const saveEdit = async (itemId: string) => {
    try {
      // API key kontrolü
      const apiKey = localStorage.getItem('api_key');
      if (!apiKey) {
        alert('Giriş yapmanız gerekiyor!');
        return;
      }

      const formData = editFormData[itemId];
      const response = await api.put(`/portfolio/${itemId}`, {
        transaction_type: formData.transaction_type,
        price: parseFloat(formData.price),
        quantity: parseFloat(formData.quantity),
        target_price: formData.target_price ? parseFloat(formData.target_price) : null,
        notes: formData.notes
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        params: {
          portfolio_id: selectedPortfolioId
        }
      });

      if (response.data.success) {
        // Refresh data
        loadPortfolio();
        // Exit edit mode
        toggleEditMode(itemId);
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      alert('Güncelleme sırasında hata oluştu!');
    }
  };

  const getTargetProgress = (currentPrice: number, targetPrice: number): number => {
    if (targetPrice <= 0) return 0;
    return ((currentPrice - targetPrice) / targetPrice) * 100;
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return '-';
    }
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return '-';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getProfitLossColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Portföy Seçici */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Portföy Seçin</label>
              <select
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                {portfolios.map((portfolio) => (
                  <option key={portfolio.portfolio_id} value={portfolio.portfolio_id}>
                    {portfolio.portfolio_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowPortfolioForm(!showPortfolioForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {showPortfolioForm ? 'İptal' : '+ Yeni Portföy'}
            </button>
            {selectedPortfolioId !== 'default' && (
              <button
                onClick={() => deletePortfolio(selectedPortfolioId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Bu portföyü sil"
              >
                🗑️ Sil
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Seçili:</span> {portfolios.find(p => p.portfolio_id === selectedPortfolioId)?.portfolio_name}
            {portfolios.find(p => p.portfolio_id === selectedPortfolioId)?.portfolio_description && (
              <span className="ml-2 text-gray-500">
                ({portfolios.find(p => p.portfolio_id === selectedPortfolioId)?.portfolio_description})
              </span>
            )}
          </div>
        </div>

        {/* Yeni Portföy Formu */}
        {showPortfolioForm && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Yeni Portföy Oluştur</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portföy Adı *</label>
                <input
                  type="text"
                  value={newPortfolio.name}
                  onChange={(e) => setNewPortfolio({...newPortfolio, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: Uzun Vadeli, Günlük İşlemler"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <input
                  type="text"
                  value={newPortfolio.description}
                  onChange={(e) => setNewPortfolio({...newPortfolio, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opsiyonel açıklama"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={addPortfolio}
                disabled={!newPortfolio.name.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Portföy Oluştur
              </button>
              <button
                onClick={() => setShowPortfolioForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Başlık ve Kontroller */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📊 Portföy Takip</h2>
            <p className="text-gray-600 text-sm">İşlemlerinizi takip edin ve performansınızı analiz edin</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? 'İptal' : '+ Yeni İşlem'}
            </button>
            <button
              onClick={updatePrices}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Güncelleniyor...' : '🔄 Fiyatları Güncelle'}
            </button>
            <button
              onClick={exportToExcel}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'İndiriliyor...' : '📄 Excel Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Özet Kartları */}
      {summary && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Özet Bilgiler & Toplam Performans</h3>
          <div className="space-y-4">
            {/* İlk Satır: Temel Bilgiler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-sm text-gray-600">Toplam İşlem</div>
                <div className="text-2xl font-bold text-gray-800">{summary.total_transactions}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-sm text-gray-600">Aktif Pozisyon</div>
                <div className="text-2xl font-bold text-gray-800">{summary.active_positions}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-sm text-gray-600">Toplam Yatırım</div>
                <div className="text-2xl font-bold text-gray-800">{formatCurrency(summary.total_investment)}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-sm text-gray-600">Güncel Değer</div>
                <div className="text-2xl font-bold text-gray-800">{formatCurrency(summary.total_current_value)}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-sm text-gray-600">Portföy Değişimi</div>
                <div className={`text-2xl font-bold ${getProfitLossColor(summary.total_profit_loss)}`}>
                  {formatCurrency(summary.total_profit_loss)}
                </div>
                <div className={`text-sm ${getProfitLossColor(summary.total_profit_loss_percent)}`}>
                  {formatPercent(summary.total_profit_loss_percent)}
                </div>
              </div>
            </div>

            {/* İkinci Satır: Kar/Zarar Özeti */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4 border-l-4 border-blue-500">
                <div className="text-sm text-gray-600 font-medium">Mevcut Kar/Zarar</div>
                <div className={`text-2xl font-bold ${getProfitLossColor(getTimeFrameProfitLoss().current)}`}>
                  {formatCurrency(getTimeFrameProfitLoss().current)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Henüz satılmamış pozisyonlar</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-4 border-l-4 border-green-500">
                <div className="text-sm text-gray-600 font-medium">Realize Kar/Zarar</div>
                <div className={`text-2xl font-bold ${
                  getTimeFrameProfitLoss().realized >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(getTimeFrameProfitLoss().realized)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Satışlardan elde edilen</div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300">
                <div className="text-sm text-gray-600 font-semibold">TOPLAM KAR/ZARAR</div>
                <div className={`text-3xl font-bold ${
                  getTimeFrameProfitLoss().total >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(getTimeFrameProfitLoss().total)}
                </div>
                <div className="text-sm text-gray-600 font-medium mt-1">Mevcut + Realize</div>
                <div className="text-xs text-gray-500">Genel performans</div>
              </div>
            </div>

            {/* Zaman Dilimi Seçenekleri */}
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-sm border p-3">
                <div className="text-xs text-gray-600 text-center mb-2 font-medium">Zaman Dilimi Seçin</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeFrame('G')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timeFrame === 'G' 
                        ? 'bg-blue-600 text-white shadow-lg scale-105' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    G (Günlük)
                  </button>
                  <button
                    onClick={() => setTimeFrame('H')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timeFrame === 'H' 
                        ? 'bg-blue-600 text-white shadow-lg scale-105' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    H (Haftalık)
                  </button>
                  <button
                    onClick={() => setTimeFrame('A')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timeFrame === 'A' 
                        ? 'bg-blue-600 text-white shadow-lg scale-105' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    A (Aylık)
                  </button>
                  <button
                    onClick={() => setTimeFrame('All')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timeFrame === 'All' 
                        ? 'bg-blue-600 text-white shadow-lg scale-105' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All (Tüm Zamanlar)
                  </button>
                </div>
                <div className="text-xs text-gray-500 text-center mt-2">
                  {timeFrame === 'G' && 'Bugünkü işlemler ve pozisyonlar'}
                  {timeFrame === 'H' && 'Bu haftaki işlemler ve pozisyonlar'}
                  {timeFrame === 'A' && 'Bu ayki işlemler ve pozisyonlar'}
                  {timeFrame === 'All' && 'Tüm zamanlar - Tüm işlemler ve pozisyonlar'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yeni İşlem Formu */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Yeni İşlem Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sembol</label>
              <input
                type="text"
                value={newItem.symbol}
                onChange={(e) => setNewItem({...newItem, symbol: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hisse kodu yazın..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Piyasa</label>
              <select
                value={newItem.market}
                onChange={(e) => {
                  setNewItem({...newItem, market: e.target.value});
                  // Piyasa değiştiğinde önerileri temizle
                  setSymbolSuggestions([]);
                  setShowSymbolSuggestions(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bist">BIST</option>
                <option value="crypto">Kripto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İşlem Türü</label>
              <select
                value={newItem.transaction_type}
                onChange={(e) => setNewItem({...newItem, transaction_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="buy">Alış</option>
                <option value="sell">Satış</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat</label>
              <input
                type="number"
                step="0.01"
                value={newItem.price}
                onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
              <input
                type="number"
                step="0.01"
                value={newItem.quantity}
                onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarih (opsiyonel)</label>
              <input
                type="datetime-local"
                value={newItem.date || ''}
                onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <input
              type="text"
              value={newItem.notes || ''}
              onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Opsiyonel notlar..."
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => addItem(newItem)}
              disabled={loading || !newItem.symbol || newItem.price <= 0 || newItem.quantity <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Pasta Grafikler */}
      {showCharts && positions && positions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Portföy Analizi</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Grafik Tipi:</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as 'allocation' | 'profit_loss')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="allocation">Portföy Dağılımı</option>
                  <option value="profit_loss">Kar/Zarar Dağılımı</option>
                </select>
              </div>
              <button
                onClick={() => setShowCharts(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Gizle
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pasta Grafik */}
            <div className="flex justify-center">
              {prepareChartData() && (
                <div className="w-full max-w-md h-72">
                  <Pie
                    data={prepareChartData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                              size: 12
                            }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.label || '';
                              const value = context.parsed;
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = ((value / total) * 100).toFixed(1);
                              return `${label}: ₺${value.toLocaleString('tr-TR')} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                    height={300}
                  />
                </div>
              )}
            </div>
            
            {/* Grafik Açıklaması */}
            <div className="flex flex-col justify-center">
              <div className="space-y-3">
                {chartType === 'allocation' ? (
                  <>
                    <h4 className="font-medium text-gray-900">Portföy Dağılımı</h4>
                    <p className="text-sm text-gray-600">
                      Bu grafik, portföyünüzdeki her hissenin toplam değer açısından ne kadar ağırlıkta olduğunu gösterir.
                    </p>
                    <div className="text-sm text-gray-600">
                      <p><strong>Toplam Portföy Değeri:</strong> ₺{positions.reduce((sum, pos) => {
                        const price = (pos.current_price ?? pos.avg_price ?? 0);
                        const value = (price * pos.total_quantity) || pos.total_cost || 0;
                        return sum + value;
                      }, 0).toLocaleString('tr-TR')}</p>
                      <p><strong>Aktif Pozisyon Sayısı:</strong> {positions.length}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="font-medium text-gray-900">Kar/Zarar Dağılımı</h4>
                    <p className="text-sm text-gray-600">
                      Bu grafik, portföyünüzdeki karlı ve zararlı pozisyonların dağılımını gösterir.
                    </p>
                    <div className="text-sm text-gray-600">
                      <p><strong>Toplam Kar:</strong> ₺{positions.filter(pos => (pos.profit_loss || 0) > 0).reduce((sum, pos) => sum + (pos.profit_loss || 0), 0).toLocaleString('tr-TR')}</p>
                      <p><strong>Toplam Zarar:</strong> ₺{Math.abs(positions.filter(pos => (pos.profit_loss || 0) < 0).reduce((sum, pos) => sum + (pos.profit_loss || 0), 0)).toLocaleString('tr-TR')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pozisyonlar Tablosu */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pozisyonlar Tablosu</h3>
          {!showCharts && (
            <button
              onClick={() => setShowCharts(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Grafikleri Göster
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('symbol', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    SEMBOL {getSortIcon('symbol', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('avg_price', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    ORT. FİYAT {getSortIcon('avg_price', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('total_quantity', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    MİKTAR {getSortIcon('total_quantity', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('current_price', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    GÜNCEL FİYAT {getSortIcon('current_price', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('target_price', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    HEDEF FİYAT {getSortIcon('target_price', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('target_progress', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    HEDEFE KALAN % {getSortIcon('target_progress', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('profit_loss', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    KAR/ZARAR {getSortIcon('profit_loss', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('profit_loss_percent', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    KAR/ZARAR % {getSortIcon('profit_loss_percent', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('realized_profit_loss', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    REALİZE KAR {getSortIcon('realized_profit_loss', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('realized_capital', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    REALİZE ANAPARA {getSortIcon('realized_capital', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('unrealized_capital', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    KALAN REALİZE {getSortIcon('unrealized_capital', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('total_value', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    TOPLAM DEĞER {getSortIcon('total_value', positionsSortConfig)}
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İŞLEMLER
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPositions.map((position) => {
                const currentValue = (position.current_price || 0) * position.total_quantity;
                const profitLoss = currentValue - position.total_cost;
                const profitLossPercent = position.total_cost > 0 ? (profitLoss / position.total_cost) * 100 : 0;
                const targetProgress = position.target_price && position.current_price ? getTargetProgress(position.current_price, position.target_price) : 0;
                const isExpanded = expandedRows.has(position.symbol);

                return (
                  <React.Fragment key={position.symbol}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {position.symbol} ({position.market})
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(position.avg_price)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {position.total_quantity.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(position.current_price || 0)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(position.target_price || 0)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={targetProgress >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercent(targetProgress)}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(profitLoss)}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercent(profitLossPercent)}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={position.realized_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(position.realized_profit_loss)}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(position.realized_capital)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(position.unrealized_capital)}
                      </td>

                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(currentValue)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => toggleRowExpansion(position.symbol)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          {isExpanded ? 'Gizle' : 'Detay'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expandable Detail Row */}
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={12} className="px-4 py-4">
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              {position.symbol} İşlem Detayları
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fiyat</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hedef</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notlar</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {position.transactions.map((item) => {
                                    const isEditing = editingItems.has(item.id);
                                    const formData = editFormData[item.id] || {};

                                    return (
                                      <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-xs text-gray-900">
                                          {item.date ? new Date(item.date).toLocaleDateString('tr-TR') : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-xs">
                                          {isEditing ? (
                                            <select
                                              value={formData.transaction_type || ''}
                                              onChange={(e) => handleEditChange(item.id, 'transaction_type', e.target.value)}
                                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                                            >
                                              <option value="buy">Alış</option>
                                              <option value="sell">Satış</option>
                                            </select>
                                          ) : (
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                              (item as any).type === 'buy' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                              {(item as any).type === 'buy' ? 'Alış' : 'Satış'}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-900">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={formData.price || ''}
                                              onChange={(e) => handleEditChange(item.id, 'price', e.target.value)}
                                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                          ) : (
                                            formatCurrency(item.price)
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-900">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={formData.quantity || ''}
                                              onChange={(e) => handleEditChange(item.id, 'quantity', e.target.value)}
                                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                          ) : (
                                            item.quantity.toLocaleString('tr-TR')
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-900">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={formData.target_price || ''}
                                              onChange={(e) => handleEditChange(item.id, 'target_price', e.target.value)}
                                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                          ) : (
                                            item.target_price ? formatCurrency(item.target_price) : '-'
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-900">
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={formData.notes || ''}
                                              onChange={(e) => handleEditChange(item.id, 'notes', e.target.value)}
                                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                          ) : (
                                            item.notes || '-'
                                          )}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                          {isEditing ? (
                                            <div className="flex space-x-1">
                                              <button
                                                onClick={() => saveEdit(item.id)}
                                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                              >
                                                Kaydet
                                              </button>
                                              <button
                                                onClick={() => toggleEditMode(item.id)}
                                                className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                              >
                                                İptal
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => toggleEditMode(item.id)}
                                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                            >
                                              Düzenle
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {positions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz pozisyon eklenmemiş. Yeni işlem eklemek için yukarıdaki butonu kullanın.
          </div>
        )}
      </div>

      {/* Toplam Kar/Zarar Tablosu */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">💰 Toplam Kar/Zarar Detayları</h3>
          <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
            <span className="font-medium">Seçili Dönem:</span> 
            {timeFrame === 'G' && 'Günlük (Bugün)'}
            {timeFrame === 'H' && 'Haftalık (Bu Hafta)'}
            {timeFrame === 'A' && 'Aylık (Bu Ay)'}
            {timeFrame === 'All' && 'Tüm Zamanlar'}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('symbol', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    SEMBOL {getSortIcon('symbol', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('total_quantity', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    MİKTAR {getSortIcon('total_quantity', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('avg_price', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    ORT. FİYAT {getSortIcon('avg_price', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('current_price', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    GÜNCEL FİYAT {getSortIcon('current_price', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('profit_loss', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    MEVCUT K/Z {getSortIcon('profit_loss', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('realized_profit_loss', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    REALİZE K/Z {getSortIcon('realized_profit_loss', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('total_profit_loss', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    TOPLAM K/Z {getSortIcon('total_profit_loss', positionsSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('total_profit_loss_percent', setPositionsSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    TOPLAM K/Z % {getSortIcon('total_profit_loss_percent', positionsSortConfig)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredPositions().map((position) => {
                const currentValue = (position.current_price || 0) * position.total_quantity;
                const unrealizedProfitLoss = currentValue - position.total_cost;
                const realizedProfitLoss = position.realized_profit_loss || 0;
                const totalProfitLoss = unrealizedProfitLoss + realizedProfitLoss;
                
                // Toplam yatırım hesaplama (maliyet + realize edilen sermaye)
                const totalInvestment = position.total_cost + Math.abs(realizedProfitLoss > 0 ? 0 : realizedProfitLoss);
                const totalProfitLossPercent = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

                return (
                  <tr key={position.symbol} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {position.symbol}
                      <div className="text-xs text-gray-500">{position.market.toUpperCase()}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {position.total_quantity.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(position.avg_price)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(position.current_price || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={unrealizedProfitLoss >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {formatCurrency(unrealizedProfitLoss)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={realizedProfitLoss >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {formatCurrency(realizedProfitLoss)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`font-bold text-lg ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalProfitLoss)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`font-bold ${totalProfitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(totalProfitLossPercent)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {positions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz pozisyon eklenmemiş.
          </div>
        )}
        
        {/* Toplam Özet */}
        {getFilteredPositions().length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">📊 Seçili Dönem Toplamı</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-600">Toplam Mevcut K/Z</div>
                <div className={`text-lg font-bold ${
                  getTimeFrameProfitLoss().current >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(getTimeFrameProfitLoss().current)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">Toplam Realize K/Z</div>
                <div className={`text-lg font-bold ${
                  getTimeFrameProfitLoss().realized >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(getTimeFrameProfitLoss().realized)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">TOPLAM K/Z</div>
                <div className={`text-xl font-bold ${
                  getTimeFrameProfitLoss().total >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(getTimeFrameProfitLoss().total)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* İşlem Geçmişi */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">İşlem Geçmişi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('date', setPortfolioSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    Tarih {getSortIcon('date', portfolioSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('symbol', setPortfolioSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    Sembol {getSortIcon('symbol', portfolioSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('transaction_type', setPortfolioSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    İşlem {getSortIcon('transaction_type', portfolioSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('price', setPortfolioSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    Fiyat {getSortIcon('price', portfolioSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('quantity', setPortfolioSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    Miktar {getSortIcon('quantity', portfolioSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('target_price', setPortfolioSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    Hedef {getSortIcon('target_price', portfolioSortConfig)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('notes', setPortfolioSortConfig)}
                >
                  <div className="flex items-center gap-1">
                    Notlar {getSortIcon('notes', portfolioSortConfig)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPortfolio.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.date ? new Date(item.date).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.symbol}</div>
                      <div className="text-xs text-gray-500">{item.market.toUpperCase()}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.transaction_type === 'buy' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.transaction_type === 'buy' ? 'Alış' : 'Satış'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.target_price ? formatCurrency(item.target_price) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {item.notes || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {portfolio.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Henüz işlem eklenmemiş.
          </div>
        )}
      </div>
    </div>
  );
}
