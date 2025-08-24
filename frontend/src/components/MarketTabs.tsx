import { useAppStore } from "../store";
import { Market, Timeframe } from "../types";

const tabs: { key: Market; label: string; icon: string }[] = [
  { key: "crypto", label: "Kripto", icon: "₿" },
  { key: "bist", label: "BIST", icon: "🇹🇷" },
  { key: "portfolio", label: "Portföy", icon: "📊" },
  { key: "watchlist", label: "Takip Listesi", icon: "📋" },
  { key: "us", label: "NASDAQ & S&P", icon: "🇺🇸" },
  { key: "fx", label: "Forex", icon: "💱" },
];

const timeframes: { key: Timeframe; label: string }[] = [
  { key: "1d", label: "1 Gün" },
  { key: "4h", label: "4 Saat" },
];

export default function MarketTabs() {
  const { market, timeframe, setMarket, setTimeframe } = useAppStore();

  return (
    <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">
      <div className="flex flex-col gap-4">
        {/* Piyasa Sekmeleri */}
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMarket(tab.key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                market === tab.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="text-base sm:text-lg">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Zaman Dilimi Seçimi */}
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <span className="text-xs sm:text-sm font-medium text-gray-600">Zaman Dilimi:</span>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeframes.map((tf) => (
              <option key={tf.key} value={tf.key}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
