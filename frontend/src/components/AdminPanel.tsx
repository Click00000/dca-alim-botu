import { useState } from 'react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  password?: string;
  email?: string;
  is_admin: boolean;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

interface Portfolio {
  portfolio_id: string;
  portfolio_name: string;
  portfolio_description: string;
  owner_username: string;
  total_transactions: number;
  total_symbols: number;
  last_updated: string;
}

interface PortfolioDetails {
  portfolio_id: string;
  total_transactions: number;
  buy_transactions: number;
  sell_transactions: number;
  total_investment: number;
  total_sales: number;
  transactions: any[];
}

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'users' | 'portfolios'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioDetails | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    is_admin: false
  });
  const [editUserForm, setEditUserForm] = useState<Partial<User> & { password?: string }>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Backend URL - Production'da environment variable kullan
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dca-scanner-backend.onrender.com';
  
  // Admin giriş
  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/admin/login`, loginForm);
      
      if (response.data.success) {
        const adminApiKey = response.data.api_key;
        setApiKey(adminApiKey);
        setIsLoggedIn(true);
        loadUsers(adminApiKey);
        loadPortfolios(adminApiKey);
      } else {
        alert(response.data.error || 'Giriş başarısız');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      alert('Giriş sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcıları yükle
  const loadUsers = async (adminApiKey?: string) => {
    try {
      const keyToUse = adminApiKey || apiKey;
      if (!keyToUse) {
        console.error('API key bulunamadı');
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${keyToUse}`
        }
      });
      
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
    }
  };

  // Portföyleri yükle
  const loadPortfolios = async (adminApiKey?: string) => {
    try {
      const keyToUse = adminApiKey || apiKey;
      if (!keyToUse) {
        console.error('API key bulunamadı');
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/admin/portfolios`, {
        headers: {
          'Authorization': `Bearer ${keyToUse}`
        }
      });
      
      if (response.data.success) {
        setPortfolios(response.data.portfolios);
      }
    } catch (error) {
      console.error('Portföyler yüklenemedi:', error);
    }
  };

  // Yeni kullanıcı oluştur
  const createUser = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/admin/users`, newUserForm, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.data.success) {
        alert('Kullanıcı başarıyla oluşturuldu');
        setNewUserForm({ username: '', email: '', password: '', is_admin: false });
        loadUsers();
      } else {
        alert(response.data.error || 'Kullanıcı oluşturulamadı');
      }
    } catch (error) {
      console.error('Kullanıcı oluşturma hatası:', error);
      alert('Kullanıcı oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcı güncelle
  const updateUser = async () => {
    if (!editingUserId) return;
    
    try {
      setLoading(true);
      const response = await axios.put(`${API_BASE_URL}/admin/users/${editingUserId}`, editUserForm, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.data.success) {
        alert('Kullanıcı güncellendi');
        setEditingUserId(null);
        setEditUserForm({});
        loadUsers();
      } else {
        alert(response.data.error || 'Kullanıcı güncellenemedi');
      }
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      alert('Kullanıcı güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcı sil
  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`"${username}" kullanıcısını silmek istediğinizden emin misiniz?`)) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.delete(`${API_BASE_URL}/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.data.success) {
        alert(response.data.message);
        loadUsers();
      } else {
        alert(response.data.error || 'Kullanıcı silinemedi');
      }
    } catch (error) {
      console.error('Kullanıcı silme hatası:', error);
      alert('Kullanıcı silinirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Portföy detaylarını getir
  const loadPortfolioDetails = async (portfolioId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/portfolio/${portfolioId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (response.data.success) {
        setSelectedPortfolio(response.data.portfolio);
      }
    } catch (error) {
      console.error('Portföy detayları yüklenemedi:', error);
    }
  };

  // Düzenleme modunu başlat
  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditUserForm({
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      is_active: user.is_active
    });
  };

  // Düzenleme modunu iptal et
  const cancelEdit = () => {
    setEditingUserId(null);
    setEditUserForm({});
  };

  // Çıkış yap
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsers([]);
    setPortfolios([]);
    setSelectedPortfolio(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              🔐 Admin Panel Girişi
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              DCA Scanner Admin Paneli
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">Kullanıcı Adı</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Kullanıcı Adı"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Şifre</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Şifre"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">🔐 DCA Scanner Admin Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Admin: {loginForm.username}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Kullanıcı Yönetimi
            </button>
            <button
              onClick={() => setActiveTab('portfolios')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'portfolios'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Portföy İzleme
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Yeni Kullanıcı Formu */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">➕ Yeni Kullanıcı Oluştur</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Kullanıcı Adı"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})}
                />
                <input
                  type="email"
                  placeholder="E-posta (opsiyonel)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                />
                <input
                  type="password"
                  placeholder="Şifre"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                />
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_admin"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={newUserForm.is_admin}
                    onChange={(e) => setNewUserForm({...newUserForm, is_admin: e.target.checked})}
                  />
                  <label htmlFor="is_admin" className="ml-2 text-sm text-gray-900">
                    Admin Yetkisi
                  </label>
                </div>
              </div>
              <button
                onClick={createUser}
                disabled={loading || !newUserForm.username || !newUserForm.password}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
              </button>
            </div>

            {/* Kullanıcı Listesi */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">👥 Kullanıcı Listesi</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şifre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yetki</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">ID: {user.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {user.password ? user.password : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_admin
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_admin ? 'Admin' : 'Kullanıcı'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(user.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {editingUserId === user.id ? (
                            <>
                              <button
                                onClick={updateUser}
                                className="text-green-600 hover:text-green-900"
                              >
                                Kaydet
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                İptal
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(user)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Düzenle
                              </button>
                              {user.username !== 'wastfc' && (
                                <button
                                  onClick={() => deleteUser(user.id, user.username)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Sil
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Düzenleme Formu */}
            {editingUserId && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">✏️ Kullanıcı Düzenle</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <input
                    type="text"
                    placeholder="Kullanıcı Adı"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editUserForm.username || ''}
                    onChange={(e) => setEditUserForm({...editUserForm, username: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder="E-posta"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editUserForm.email || ''}
                    onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                  />
                  <input
                    type="password"
                    placeholder="Yeni Şifre (boş bırakılırsa değişmez)"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editUserForm.password || ''}
                    onChange={(e) => setEditUserForm({...editUserForm, password: e.target.value})}
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit_is_admin"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={editUserForm.is_admin || false}
                      onChange={(e) => setEditUserForm({...editUserForm, is_admin: e.target.checked})}
                    />
                    <label htmlFor="edit_is_admin" className="ml-2 text-sm text-gray-900">
                      Admin Yetkisi
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit_is_active"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={editUserForm.is_active !== false}
                      onChange={(e) => setEditUserForm({...editUserForm, is_active: e.target.checked})}
                    />
                    <label htmlFor="edit_is_active" className="ml-2 text-sm text-gray-900">
                      Aktif
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'portfolios' && (
          <div className="space-y-6">
            {/* Portföy Listesi */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">📊 Tüm Portföyler</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Portföy</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sahip</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem Sayısı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sembol Sayısı</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Güncelleme</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {portfolios.map((portfolio) => (
                      <tr key={portfolio.portfolio_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{portfolio.portfolio_name}</div>
                          <div className="text-sm text-gray-500">ID: {portfolio.portfolio_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {portfolio.owner_username || 'Bilinmiyor'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {portfolio.portfolio_description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {portfolio.total_transactions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {portfolio.total_symbols}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {portfolio.last_updated}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => loadPortfolioDetails(portfolio.portfolio_id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Detayları Gör
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Portföy Detayları */}
            {selectedPortfolio && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    📊 Portföy Detayları: {selectedPortfolio.portfolio_id}
                  </h3>
                  <button
                    onClick={() => setSelectedPortfolio(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕ Kapat
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">Toplam İşlem</div>
                    <div className="text-2xl font-bold text-blue-900">{selectedPortfolio.total_transactions}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">Alış İşlemleri</div>
                    <div className="text-2xl font-bold text-green-900">{selectedPortfolio.buy_transactions}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-sm text-red-600 font-medium">Satış İşlemleri</div>
                    <div className="text-2xl font-bold text-red-900">{selectedPortfolio.sell_transactions}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm text-yellow-600 font-medium">Toplam Yatırım</div>
                    <div className="text-xl font-bold text-yellow-900">
                      ₺{selectedPortfolio.total_investment.toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-purple-600 font-medium">Toplam Satış</div>
                    <div className="text-xl font-bold text-purple-900">
                      ₺{selectedPortfolio.total_sales.toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                    </div>
                  </div>
                </div>

                {/* Son İşlemler */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">📝 Son İşlemler</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sembol</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fiyat</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPortfolio.transactions.map((transaction, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {new Date(transaction.date).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {transaction.symbol}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.transaction_type === 'buy'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.transaction_type === 'buy' ? 'Alış' : 'Satış'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              ₺{transaction.price.toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                              {transaction.quantity.toLocaleString('tr-TR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
