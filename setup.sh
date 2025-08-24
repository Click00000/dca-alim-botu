#!/bin/bash

echo "🚀 DCA Scanner Kurulum Scripti"
echo "================================"

# Python sanal ortam oluştur
echo "📦 Python sanal ortam oluşturuluyor..."
python3 -m venv .venv

# Sanal ortamı aktifleştir
echo "🔧 Sanal ortam aktifleştiriliyor..."
source .venv/bin/activate

# Python paketlerini yükle
echo "📚 Python paketleri yükleniyor..."
pip install -r requirements.txt

# Frontend klasörüne git
echo "🌐 Frontend bağımlılıkları yükleniyor..."
cd frontend

# Node.js paketlerini yükle
echo "📦 Node.js paketleri yükleniyor..."
npm install

echo ""
echo "✅ Kurulum tamamlandı!"
echo ""
echo "🚀 Uygulamayı başlatmak için:"
echo ""
echo "Terminal 1 (Backend):"
echo "  source .venv/bin/activate"
echo "  uvicorn main:app --reload --port 8000"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "🌐 Tarayıcıda açın: http://localhost:5173"
echo "🔌 API: http://localhost:8000"
