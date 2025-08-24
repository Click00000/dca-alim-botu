import { useState, useEffect } from "react";
import MarketTabs from "./components/MarketTabs";
import ScannerPanel from "./components/ScannerPanel";
import ChartPanel from "./components/ChartPanel";
import PortfolioPanel from "./components/PortfolioPanel";
import WatchlistPanel from "./components/WatchlistPanel";
import AdminPanel from "./components/AdminPanel";
import LoginPanel from "./components/LoginPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAppStore } from "./store";

export default function App() {
  const { market } = useAppStore();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showLoginPanel, setShowLoginPanel] = useState(false);

  // Sayfa yüklendiğinde user data ve API key kontrolü
  useEffect(() => {
    const user = localStorage.getItem('user_data');
    const apiKey = localStorage.getItem('api_key');
    
    if (user && apiKey) {
      setIsLoggedIn(true);
      setUserData(JSON.parse(user));
      
      // Normal kullanıcılar için otomatik olarak portföy sekmesine yönlendir
      if (!JSON.parse(user).is_admin) {
        useAppStore.getState().setMarket('portfolio');
      }
    }
  }, []);

  const handleLoginSuccess = (user: any) => {
    setIsLoggedIn(true);
    setUserData(user);
    setShowLoginPanel(false);
    
    // Normal kullanıcılar için otomatik olarak portföy sekmesine yönlendir
    if (!user.is_admin) {
      useAppStore.getState().setMarket('portfolio');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_data');
    localStorage.removeItem('api_key');
    setIsLoggedIn(false);
    setUserData(null);
    // Sayfa yenileme ekle
    window.location.reload();
  };

  // Login panel gösteriliyorsa sadece login panel'i göster
  if (showLoginPanel) {
    return (
      <ErrorBoundary>
        <LoginPanel 
          onLoginSuccess={handleLoginSuccess}
          onBackToMain={() => setShowLoginPanel(false)}
        />
      </ErrorBoundary>
    );
  }

  // Admin panel gösteriliyorsa sadece admin panel'i göster
  if (showAdminPanel) {
    return (
      <ErrorBoundary>
        <AdminPanel />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-2 sm:p-4">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2 text-center sm:text-left">
                  🚀 DCA Scanner
                </h1>
                <p className="text-gray-600 text-base sm:text-lg text-center sm:text-left">
                  Manuel Tarama ve Analiz Platformu
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {isLoggedIn ? (
                  <>
                    <span className="text-sm text-gray-600">
                      Merhaba, <span className="font-semibold">{userData?.username}</span>
                    </span>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Çıkış
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowLoginPanel(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Giriş Yap
                  </button>
                )}
                
                {userData?.is_admin && (
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    title="Admin Paneli"
                  >
                    🔐 Admin
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Piyasa Sekmeleri */}
          {/* Market Tabs - Admin kullanıcılar tüm sekmeleri, normal kullanıcılar sadece portföy sekmesini görür */}
          {userData?.is_admin ? (
            <MarketTabs />
          ) : isLoggedIn ? (
            // Normal kullanıcılar için sadece portföy sekmesi
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => useAppStore.getState().setMarket('portfolio')}
                    className="py-2 px-1 border-b-2 font-medium text-sm border-blue-500 text-blue-600"
                  >
                    📊 Portföy
                  </button>
                </nav>
              </div>
            </div>
          ) : null}

          {/* İçerik Panelleri */}
          {market === 'portfolio' ? (
            <PortfolioPanel />
          ) : market === 'watchlist' && userData?.is_admin ? (
            <WatchlistPanel />
          ) : userData?.is_admin ? (
            <>
              <ScannerPanel />
              <ChartPanel />
            </>
          ) : isLoggedIn ? (
            // Normal kullanıcılar için sadece portföy paneli
            <PortfolioPanel />
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                🔒 Erişim Kısıtlı
              </h2>
              <p className="text-gray-600">
                Bu özellikleri kullanmak için admin yetkisi gereklidir.
              </p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
