import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import axios from 'axios'

// Hızlı teşhis: fetch ve form submit logger ekle
if (import.meta.env.DEV) {
  const _fetch = window.fetch.bind(window);
  window.fetch = (...args) => {
    console.log("FETCH DEBUG →", args[0]);
    return _fetch(...args as Parameters<typeof _fetch>);
  };
  document.addEventListener("submit", (e) => {
    console.log("FORM SUBMIT DEBUG →", e.target);
  });
}

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

// Runtime assert - global axios kullanımını yakala
if (import.meta.env.DEV) {
  // @ts-ignore
  if ((window as any).axios) {
    throw new Error("Global axios detected. Use '@/lib/api' only.");
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
