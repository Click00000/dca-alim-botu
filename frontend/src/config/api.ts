// API Configuration
export const API_BASE_URL = 'https://dca-scanner-backend.onrender.com';

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/user/login`,
  ADMIN_LOGIN: `${API_BASE_URL}/admin/login`,
  PORTFOLIO_LIST: `${API_BASE_URL}/portfolio/list`,
  PORTFOLIO_CREATE: `${API_BASE_URL}/portfolio/create`,
  PORTFOLIO_GET: `${API_BASE_URL}/portfolio`,
  PORTFOLIO_ADD: `${API_BASE_URL}/portfolio/add`,
  PORTFOLIO_POSITIONS: `${API_BASE_URL}/portfolio/positions`,
  PORTFOLIO_SUMMARY: `${API_BASE_URL}/portfolio/summary`,
  PORTFOLIO_UPDATE_PRICES: `${API_BASE_URL}/portfolio/update-prices`,
  PORTFOLIO_EXPORT: `${API_BASE_URL}/portfolio/export-excel`,
  SCAN: `${API_BASE_URL}/scan`,
  SEARCH_BIST: `${API_BASE_URL}/search-bist`,
  SEARCH_CRYPTO: `${API_BASE_URL}/search-crypto`,
  CHART: `${API_BASE_URL}/chart`,
  WATCHLIST: `${API_BASE_URL}/watchlist`,
  WATCHLIST_ADD: `${API_BASE_URL}/watchlist/add`,
  WATCHLIST_UPDATE: `${API_BASE_URL}/watchlist/update-prices`,
  HEALTH: `${API_BASE_URL}/health`,
  STATUS: `${API_BASE_URL}/status`
};
