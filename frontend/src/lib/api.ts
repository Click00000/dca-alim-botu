import axios from "axios";

// Build-time env (Vite): sadece build sırasında tekstle değişir
const BUILD_API = import.meta.env.VITE_API_URL?.trim();

// Runtime fallback: asla window.location.origin kullanma; prod için hard fallback ekle
const FALLBACK_API = "https://dca-scanner-backend.onrender.com";

// Nihai seçim: önce BUILD_API, yoksa FALLBACK_API
export const api = axios.create({
  baseURL: BUILD_API || FALLBACK_API, // daima MUTLAK URL
  timeout: 30000, // Timeout'u 30 saniyeye çıkar
});

// Debug: API URL'yi logla
console.log("🔧 API Instance oluşturuldu:", {
  BUILD_API,
  FALLBACK_API,
  finalBaseURL: api.defaults.baseURL
});

// Debug interceptor - gerçek giden URL'yi logla
api.interceptors.request.use((cfg) => {
  console.log("API(INSTANCE) DEBUG →", cfg.method?.toUpperCase(), cfg.baseURL, cfg.url);
  return cfg;
});

// Güvenlik: başka yerde yanlışlıkla override edilmesin
Object.freeze(api.defaults);
