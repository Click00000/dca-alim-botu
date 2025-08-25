#!/bin/bash

echo "🚀 DCA Scanner Setup Script"
echo "============================"

# Python paketlerini yükle
echo "📦 Python paketleri yükleniyor..."
pip install -r requirements.txt

# Database'i başlat
echo "🔧 Database başlatılıyor..."
python -c "
import sqlite3
import os

# Database dosyasını oluştur
db_path = os.environ.get('DATABASE_PATH', 'dca_scanner.db')
print(f'Database path: {db_path}')

# Database bağlantısını test et
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Tabloları oluştur
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TEXT NOT NULL,
        last_login TEXT,
        is_active BOOLEAN DEFAULT TRUE
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS portfolios (
        portfolio_id TEXT PRIMARY KEY,
        portfolio_name TEXT NOT NULL,
        portfolio_description TEXT,
        owner_username TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_updated TEXT
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS portfolio_items (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        market TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        price REAL NOT NULL,
        quantity REAL NOT NULL,
        date TEXT NOT NULL,
        target_price REAL,
        notes TEXT,
        current_price REAL,
        last_updated TEXT,
        owner_username TEXT NOT NULL,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios (portfolio_id)
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS watchlist (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        market TEXT NOT NULL,
        added_date TEXT NOT NULL,
        current_price REAL,
        last_updated TEXT,
        target_price REAL,
        notes TEXT
    )
''')

conn.commit()
conn.close()
print('✅ Database tabloları başarıyla oluşturuldu')
"

# Backend'i test et
echo "🧪 Backend test ediliyor..."
python -c "
from main import app, init_database, ensure_default_users_exist
print('✅ Backend import başarılı')
"

echo "🎉 Setup tamamlandı!"
echo "📝 Backend'i başlatmak için: python main.py"
echo "📝 Frontend'i başlatmak için: cd frontend && npm run dev"
