import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import axios from 'axios'

// Service Worker cache temizleme
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => {
      console.log("🗑️ Service Worker unregister ediliyor:", r);
      r.unregister();
    });
  });
}

// Debug interceptor - gerçek giden URL'yi logla
axios.interceptors.request.use((cfg) => {
  console.log("🔍 AXIOS DEBUG → baseURL:", axios.defaults.baseURL, " url:", cfg.url, " full URL:", cfg.baseURL + cfg.url);
  return cfg;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
