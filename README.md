# 🚀 DCA Scanner - Manuel Tarama ve Analiz Platformu

## 📋 Proje Açıklaması
DCA (Dollar Cost Averaging) stratejisi için geliştirilmiş, çoklu piyasa tarama ve portföy yönetim platformu.

## 🛠️ Teknolojiler
- **Backend:** FastAPI (Python 3.11)
- **Frontend:** React + TypeScript + Vite
- **Database:** JSON files
- **Authentication:** Custom API Key system

## 🚀 Deploy

### Backend (Render.com)
1. **Repository'yi clone et**
2. **Render.com'da yeni Web Service oluştur**
3. **Environment Variables:**
   - `PYTHON_VERSION`: `3.11.13`
   - `PORT`: `8014` (Render otomatik atayacak)
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel.com)
1. **Repository'yi Vercel'e bağla**
2. **Environment Variables:**
   - `VITE_API_URL`: Backend URL'i (örn: `https://your-backend.onrender.com`)
3. **Deploy et**

## 🔧 Local Development

### Backend
```bash
# Virtual environment oluştur
python3.11 -m venv .venv
source .venv/bin/activate

# Dependencies yükle
pip install -r requirements.txt

# Backend'i başlat
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📁 Proje Yapısı
```
├── main.py                 # FastAPI backend
├── requirements.txt        # Python dependencies
├── Procfile              # Render deploy config
├── runtime.txt           # Python version
├── frontend/             # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── data/                 # JSON data files
```

## 🔐 Test Kullanıcıları
- **Normal Kullanıcı:** `deneme1` / `deneme123`
- **Admin:** `admin` / `Sanene88`

## 🌐 API Endpoints
- **Docs:** `/docs` (Swagger UI)
- **Login:** `/user/login`
- **Portfolio:** `/portfolio/*`
- **Admin:** `/admin/*`

## 📝 Notlar
- Python 3.11+ gerekli
- pandas==2.0.3 ve numpy==1.24.3 kullanılıyor
- TEST_MODE aktif (şifreler plain text)
# Vercel deploy trigger
