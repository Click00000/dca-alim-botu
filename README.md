# 🚀 DCA Scanner - Portföy Yönetim Sistemi

## 📋 Sistem Özellikleri

Bu sistem, kullanıcıların kendi portföylerini oluşturup yönetebilecekleri bir DCA (Dollar Cost Averaging) tarama ve portföy yönetim platformudur.

### 🔐 Güvenlik Özellikleri
- **JWT API Key Authentication**: Her kullanıcı için benzersiz API key
- **Kullanıcı İzolasyonu**: Her kullanıcı sadece kendi portföylerini görebilir
- **Admin Yetkileri**: Admin kullanıcılar tüm portföyleri görüntüleyebilir
- **Şifre Hash'leme**: Güvenli şifre saklama

### 📊 Portföy Yönetimi
- **Çoklu Portföy**: Her kullanıcı maksimum 20 portföy oluşturabilir
- **İşlem Takibi**: Alım/satım işlemlerini detaylı olarak kaydetme
- **Fiyat Güncelleme**: Otomatik fiyat güncelleme sistemi
- **Excel Export**: Portföy verilerini Excel formatında dışa aktırma
- **Kar/Zarar Hesaplama**: Detaylı kar/zarar analizi

### 🔍 Tarama Özellikleri
- **BIST Hisse Tarama**: Türkiye borsası hisselerinde tarama
- **Kripto Tarama**: Kripto para birimlerinde tarama
- **Teknik Analiz**: TradingView entegrasyonu ile teknik göstergeler

## 🚀 Kurulum ve Çalıştırma

### Backend Kurulumu
```bash
# Gerekli paketleri yükle
pip install -r requirements.txt

# Backend'i başlat
python main.py
```

Backend varsayılan olarak `http://localhost:8014` adresinde çalışır.

### Frontend Kurulumu
```bash
cd frontend

# Gerekli paketleri yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

Frontend varsayılan olarak `http://localhost:3000` adresinde çalışır.

## 👥 Kullanıcı Yönetimi

### Varsayılan Kullanıcılar
- **Admin**: `wastfc` / `Sanene88`
- **Test Kullanıcısı**: `deneme1` / `deneme1`

### Yeni Kullanıcı Oluşturma
Admin panelinden yeni kullanıcılar oluşturulabilir.

## 📱 Kullanım

### 1. Giriş Yapma
- Ana sayfada "Giriş Yap" butonuna tıklayın
- Kullanıcı adı ve şifrenizi girin
- Başarılı girişten sonra otomatik olarak portföy sekmesine yönlendirilirsiniz

### 2. Portföy Oluşturma
- "Yeni Portföy" butonuna tıklayın
- Portföy adı ve açıklamasını girin
- Portföy otomatik olarak oluşturulur

### 3. İşlem Ekleme
- Portföy seçin
- "Yeni İşlem" butonuna tıklayın
- Sembol, işlem türü, fiyat ve miktar bilgilerini girin
- İşlemi kaydedin

### 4. Portföy Takibi
- Pozisyonlarınızı görüntüleyin
- Kar/zarar durumunu takip edin
- Fiyatları güncelleyin
- Excel raporu alın

## 🔧 API Endpoint'leri

### Authentication
- `POST /admin/login` - Admin girişi
- `POST /user/login` - Kullanıcı girişi

### Portfolio
- `GET /portfolio/list` - Kullanıcının portföylerini listele
- `GET /portfolio?portfolio={id}` - Portföy işlemlerini getir
- `POST /portfolio/create` - Yeni portföy oluştur
- `POST /portfolio/add` - İşlem ekle
- `PUT /portfolio/{item_id}` - İşlem güncelle
- `DELETE /portfolio/{item_id}` - İşlem sil
- `GET /portfolio/summary?portfolio={id}` - Portföy özeti
- `GET /portfolio/positions?portfolio={id}` - Pozisyonlar
- `POST /portfolio/update-prices?portfolio_id={id}` - Fiyatları güncelle
- `GET /portfolio/export-excel?portfolio_id={id}` - Excel export

### Admin (Sadece Admin Kullanıcılar)
- `GET /admin/users` - Tüm kullanıcıları listele
- `POST /admin/users` - Yeni kullanıcı oluştur
- `PUT /admin/users/{user_id}` - Kullanıcı güncelle
- `DELETE /admin/users/{user_id}` - Kullanıcı sil
- `GET /admin/portfolios` - Tüm portföyleri listele

## 🛠️ Teknik Detaylar

### Backend
- **FastAPI**: Modern Python web framework
- **Pydantic**: Veri doğrulama
- **TradingView TA**: Teknik analiz göstergeleri
- **CCXT**: Kripto exchange entegrasyonu

### Frontend
- **React**: Modern JavaScript framework
- **TypeScript**: Tip güvenliği
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client

### Veri Saklama
- **JSON Files**: Dosya tabanlı veri saklama
- **Portfolio Isolation**: Her kullanıcı için ayrı dosyalar
- **Backup System**: Otomatik yedekleme

## 🔒 Güvenlik Notları

- API key'ler güvenli şekilde saklanmalı
- Şifreler hash'lenmiş olarak saklanır
- Her kullanıcı sadece kendi verilerine erişebilir
- Admin kullanıcılar tüm verilere erişebilir

## 🐛 Bilinen Sorunlar ve Çözümler

### Login Sorunları
- Şifre yanlışsa: Şifrenizi kontrol edin
- API key hatası: Tekrar giriş yapın

### Portfolio Sorunları
- Portfolio bulunamadı: Portfolio listesini yenileyin
- İşlem eklenemiyor: Portfolio seçimini kontrol edin

### Fiyat Güncelleme
- Rate limiting: TradingView API limitleri nedeniyle bekleme süreleri
- Fiyat alınamıyor: Sembol adını kontrol edin

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Console loglarını kontrol edin
2. Backend loglarını inceleyin
3. API endpoint'lerini test edin

## 🚀 Gelecek Özellikler

- [ ] Gerçek zamanlı fiyat takibi
- [ ] Mobil uygulama
- [ ] Gelişmiş analiz araçları
- [ ] Otomatik alım/satım
- [ ] Email bildirimleri
- [ ] Çoklu dil desteği
