# 🚀 DCA Scanner - DCA Alım Botu

DCA (Dollar Cost Averaging) stratejisi için geliştirilmiş manuel tarama ve portföy yönetim platformu.

## ✨ Özellikler

- **BIST Hisse Taraması**: Türkiye borsası hisselerinde DCA sinyalleri
- **Kripto Para Taraması**: Top 100 kripto token'da DCA analizi
- **Portföy Yönetimi**: Çoklu portföy desteği ile işlem takibi
- **Takip Listesi**: Favori hisseleri takip etme
- **Admin Paneli**: Kullanıcı ve portföy yönetimi
- **Excel Export**: Portföy raporlarını Excel formatında indirme

## 🛠️ Teknik Detaylar

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite (Production'da PostgreSQL önerilir)
- **Authentication**: API Key tabanlı
- **Data Sources**: TradingView API, CCXT

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Lightweight Charts
- **State Management**: Zustand

## 🚀 Kurulum

### 1. Repository'yi Klonlayın
```bash
git clone <repository-url>
cd dca-alim-botu
```

### 2. Backend Kurulumu
```bash
# Python paketlerini yükle
pip install -r requirements.txt

# Database'i başlat
chmod +x setup.sh
./setup.sh

# Backend'i başlat
python main.py
```

### 3. Frontend Kurulumu
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Deployment

### Render (Backend)
1. Render'da yeni Web Service oluşturun
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `python main.py`
4. Environment Variables:
   - `DATABASE_PATH`: `dca_scanner.db`
   - `PORT`: `$PORT`

### Vercel (Frontend)
1. Vercel'de yeni proje oluşturun
2. Build Command: `npm run build`
3. Environment Variables:
   - `VITE_API_URL`: Backend URL'iniz

## 🔧 Database Yönetimi

### SQLite (Development)
- Veriler `dca_scanner.db` dosyasında saklanır
- Otomatik migration ile JSON veriler database'e taşınır

### PostgreSQL (Production)
```bash
# requirements.txt'ye ekleyin
psycopg2-binary>=2.9.0

# Environment variable
DATABASE_URL=postgresql://username:password@localhost:5432/dca_scanner
```

## 📊 API Endpoints

### Authentication
- `POST /user/login` - Kullanıcı girişi
- `POST /admin/login` - Admin girişi

### Portfolio
- `GET /portfolio/list` - Portföy listesi
- `POST /portfolio/create` - Portföy oluştur
- `POST /portfolio/add` - İşlem ekle
- `GET /portfolio/positions` - Pozisyonlar
- `GET /portfolio/summary` - Portföy özeti

### Scanning
- `GET /scan` - DCA taraması
- `GET /search-bist` - BIST hisse arama
- `GET /search-crypto` - Kripto arama

## 🔐 Güvenlik

- API Key tabanlı authentication
- Kullanıcı bazlı veri izolasyonu
- Admin yetki kontrolü
- Rate limiting (TradingView API)

## 🐛 Sorun Giderme

### Kullanıcı Bilgileri Siliniyor
- **Çözüm**: Database kullanımına geçildi
- **Kontrol**: `dca_scanner.db` dosyası mevcut mu?

### Portfolio Oluşturulamıyor
- **Çözüm**: Frontend portfolio seçimi düzeltildi
- **Kontrol**: Console'da hata mesajları var mı?

### Python 3.11 Uyumluluk
- **Çözüm**: Package versiyonları güncellendi
- **Kontrol**: `pip list` ile versiyonları kontrol edin

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

- **Developer**: [Your Name]
- **Email**: [your.email@example.com]
- **Project Link**: [https://github.com/username/dca-alim-botu](https://github.com/username/dca-alim-botu)
