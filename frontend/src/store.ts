import { create } from "zustand";
import { Market, Timeframe, ScanItem, WatchlistItem } from "./types";

interface AppState {
  market: Market;
  timeframe: Timeframe;
  items: ScanItem[];
  loading: boolean;
  chartLoading: boolean;
  selected?: ScanItem;
  error?: string;
  lastScanTime?: Date;
  // Takip listesi state'i
  watchlist: WatchlistItem[];
  watchlistLoading: boolean;
}

interface AppActions {
  setMarket: (market: Market) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setItems: (items: ScanItem[]) => void;
  setLoading: (loading: boolean) => void;
  setChartLoading: (loading: boolean) => void;
  setSelected: (selected?: ScanItem) => void;
  setError: (error?: string) => void;
  clearError: () => void;
  setLastScanTime: (time: Date) => void;
  reset: () => void;
  // Takip listesi actions
  setWatchlist: (watchlist: WatchlistItem[]) => void;
  setWatchlistLoading: (loading: boolean) => void;
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (id: string) => void;
  updateWatchlistItem: (id: string, updates: Partial<WatchlistItem>) => void;
}

type AppStore = AppState & AppActions;

const initialState = {
  market: "crypto" as Market,
  timeframe: "1d" as Timeframe,
  items: [],
  loading: false,
  chartLoading: false,
  selected: undefined,
  error: undefined,
  lastScanTime: undefined,
  // Takip listesi initial state
  watchlist: [],
  watchlistLoading: false,
};

export const useAppStore = create<AppStore>((set) => ({
  // State
  ...initialState,

  // Actions
  setMarket: (market) => set({ market }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setItems: (items) => set({ items }),
  setLoading: (loading) => set({ loading }),
  setChartLoading: (loading) => set({ chartLoading: loading }),
  setSelected: (selected) => set({ selected }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: undefined }),
  setLastScanTime: (time) => set({ lastScanTime: time }),
  reset: () => set(initialState),
  
  // Takip listesi actions
  setWatchlist: (watchlist) => set({ watchlist }),
  setWatchlistLoading: (loading) => set({ watchlistLoading: loading }),
  addToWatchlist: (item) => set((state) => ({ 
    watchlist: [...state.watchlist, item] 
  })),
  removeFromWatchlist: (id) => set((state) => ({ 
    watchlist: state.watchlist.filter(item => item.id !== id) 
  })),
  updateWatchlistItem: (id, updates) => set((state) => ({
    watchlist: state.watchlist.map(item => 
      item.id === id ? { ...item, ...updates } : item
    )
  })),
}));
