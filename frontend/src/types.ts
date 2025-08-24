export type Market = "crypto" | "bist" | "portfolio" | "watchlist" | "us" | "fx";
export type Timeframe = "1d" | "4h";

export interface ScanItem {
  symbol: string;
  market: Market;
  score: number;
  category: string;
  RL: number;
  VAL: number;
  RH: number;
  H: number;
  ATR: number;
  volRatio: number;
  close: number;
  isDCA: boolean;
  isDipReclaim: boolean;
  isNearBreakout: boolean;
  isBreakout: boolean;
  ema20: number;
  ema50: number;
  avwap: number;
  // Yeni DCA algoritması için ek alanlar
  score_details?: {
    akumulasyon: number;
    spring: number;
    obv: number;
    hacim: number;
    breakout_yakin: number;
    ema_kesisim: number;
    rsi_toparlanma: number;
    atr: number; // ATR puanlaması eklendi
    range_pct: number; // Range yüzdesi eklendi
    range_width_score?: number; // Bant genişliği puanı (0-10)
    range_position_score?: number; // Konum puanı (0-10)
    atr_bonus?: number; // ATR bonus puanı (0-1)
    // Spring detaylı puanlama
    spring_wick_score?: number; // Fitil/gövde oranı puanı (0-7)
    spring_pos_score?: number;  // Fitil pozisyonu puanı (0-4)
    spring_support_score?: number; // Destek yakınlığı puanı (0-4)
    spring_vol_bonus?: number;  // Hacim bonusu (0-1)
    // Yeni akıllı hacim puanlama sistemi
    volume_score?: number; // Toplam hacim skoru (0-10)
    dry_up_score?: number; // Kuruma puanı (0-3)
    spring_volume_score?: number; // Spring hacmi puanı (0-3)
    breakout_volume_score?: number; // Kırılım hacmi puanı (0-3)
    churn_penalty?: number; // Churn cezası (0 to -1)
    // Golden Cross bonus
    golden_cross_bonus?: number; // EMA20-EMA50 Golden Cross bonus (+2)
  };
  range_pct?: number;
  // Pine Script hedef bantları
  targets?: {
    T1: { from: number; to: number; label: string };
    T2: { from: number; to: number; label: string };
    T3: { from: number; to: number; label: string };
  };
}

export interface ScanResponse {
  items: ScanItem[];
  count: number;
}

// Portföy tipleri
export interface PortfolioItem {
  id: string;
  symbol: string;
  market: string;
  transaction_type: string; // "buy" veya "sell"
  price: number;
  quantity: number;
  date: string;
  target_price?: number;
  notes?: string;
  current_price?: number;
  last_updated?: string;
}

export interface PortfolioPosition {
  symbol: string;
  market: string;
  total_quantity: number;
  total_cost: number;
  realized_capital: number;  // Realize edilen anapara
  unrealized_capital: number;  // Kalan realize (henüz satılmamış)
  realized_percentage: number;  // Realize yüzdesi
  realized_profit_loss: number;  // Realize edilen kar/zarar
  avg_price: number;  // Ortalama alış fiyatı
  current_price?: number;
  last_updated?: string;
  target_price?: number;
  notes: string;
  transactions: PortfolioItem[];
}

export interface PortfolioSummary {
  total_transactions: number;
  active_positions: number;
  total_investment: number;
  total_current_value: number;
  total_profit_loss: number;
  total_profit_loss_percent: number;
}

export interface PortfolioAddRequest {
  symbol: string;
  market: string;
  transaction_type: string; // "buy" veya "sell"
  price: number;
  quantity: number;
  target_price?: number;
  notes?: string;
  portfolio_id: string;
}

export interface PortfolioUpdateRequest {
  price?: number;
  quantity?: number;
  target_price?: number;
  notes?: string;
}

// Takip listesi tipleri
export interface WatchlistItem {
  id: string;
  symbol: string;
  market: string;
  added_date: string;
  current_price?: number;
  last_updated?: string;
  target_price?: number;
  notes?: string;
}

export interface WatchlistAddRequest {
  symbol: string;
  market: string;
  target_price?: number;
  notes?: string;
}

export interface WatchlistUpdateRequest {
  target_price?: number;
  notes?: string;
}
