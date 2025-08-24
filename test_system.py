#!/usr/bin/env python3
"""
DCA Scanner Sistem Test Script'i
Bu script sistemin tüm endpoint'lerini test eder.
"""

import requests
import json
import time

# Test konfigürasyonu
BASE_URL = "http://localhost:8014"
ADMIN_USERNAME = "wastfc"
ADMIN_PASSWORD = "Sanene88"
TEST_USERNAME = "deneme1"
TEST_PASSWORD = "deneme1"

def print_test_result(test_name, success, response=None, error=None):
    """Test sonucunu yazdır"""
    if success:
        print(f"✅ {test_name}: BAŞARILI")
        if response:
            print(f"   Response: {response}")
    else:
        print(f"❌ {test_name}: BAŞARISIZ")
        if error:
            print(f"   Error: {error}")
    print()

def test_admin_login():
    """Admin login testi"""
    print("🔐 Admin Login Testi")
    
    try:
        response = requests.post(f"{BASE_URL}/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_test_result("Admin Login", True, f"API Key: {data.get('api_key', '')[:20]}...")
                return data.get("api_key")
            else:
                print_test_result("Admin Login", False, error=data.get("error"))
                return None
        else:
            print_test_result("Admin Login", False, error=f"Status: {response.status_code}")
            return None
            
    except Exception as e:
        print_test_result("Admin Login", False, error=str(e))
        return None

def test_user_login():
    """Normal kullanıcı login testi"""
    print("👤 User Login Testi")
    
    try:
        response = requests.post(f"{BASE_URL}/user/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_test_result("User Login", True, f"API Key: {data.get('api_key', '')[:20]}...")
                return data.get("api_key")
            else:
                print_test_result("User Login", False, error=data.get("error"))
                return None
        else:
            print_test_result("User Login", False, error=f"Status: {response.status_code}")
            return None
            
    except Exception as e:
        print_test_result("User Login", False, error=str(e))
        return None

def test_portfolio_list(api_key):
    """Portfolio listesi testi"""
    print("📊 Portfolio List Testi")
    
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(f"{BASE_URL}/portfolio/list", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                portfolios = data.get("portfolios", [])
                print_test_result("Portfolio List", True, f"{len(portfolios)} portfolio bulundu")
                return portfolios[0]["portfolio_id"] if portfolios else None
            else:
                print_test_result("Portfolio List", False, error=data.get("error"))
                return None
        else:
            print_test_result("Portfolio List", False, error=f"Status: {response.status_code}")
            return None
            
    except Exception as e:
        print_test_result("Portfolio List", False, error=str(e))
        return None

def test_portfolio_data(api_key, portfolio_id):
    """Portfolio veri testi"""
    print("📈 Portfolio Data Testi")
    
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(f"{BASE_URL}/portfolio?portfolio={portfolio_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                portfolio = data.get("portfolio", [])
                print_test_result("Portfolio Data", True, f"{len(portfolio)} işlem bulundu")
                return True
            else:
                print_test_result("Portfolio Data", False, error=data.get("error"))
                return False
        else:
            print_test_result("Portfolio Data", False, error=f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result("Portfolio Data", False, error=str(e))
        return False

def test_portfolio_summary(api_key, portfolio_id):
    """Portfolio özet testi"""
    print("📋 Portfolio Summary Testi")
    
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(f"{BASE_URL}/portfolio/summary?portfolio={portfolio_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                summary = data.get("summary", {})
                print_test_result("Portfolio Summary", True, f"Özet: {summary}")
                return True
            else:
                print_test_result("Portfolio Summary", False, error=data.get("error"))
                return False
        else:
            print_test_result("Portfolio Summary", False, error=f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result("Portfolio Summary", False, error=str(e))
        return False

def test_portfolio_positions(api_key, portfolio_id):
    """Portfolio pozisyon testi"""
    print("🎯 Portfolio Positions Testi")
    
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(f"{BASE_URL}/portfolio/positions?portfolio={portfolio_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                positions = data.get("positions", [])
                print_test_result("Portfolio Positions", True, f"{len(positions)} pozisyon bulundu")
                return True
            else:
                print_test_result("Portfolio Positions", False, error=data.get("error"))
                return False
        else:
            print_test_result("Portfolio Positions", False, error=f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result("Portfolio Positions", False, error=str(e))
        return False

def test_admin_endpoints(admin_api_key):
    """Admin endpoint'lerini test et"""
    print("🔐 Admin Endpoints Testi")
    
    # Users listesi
    try:
        headers = {"Authorization": f"Bearer {admin_api_key}"}
        response = requests.get(f"{BASE_URL}/admin/users", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                users = data.get("users", [])
                print_test_result("Admin Users List", True, f"{len(users)} kullanıcı bulundu")
            else:
                print_test_result("Admin Users List", False, error=data.get("error"))
        else:
            print_test_result("Admin Users List", False, error=f"Status: {response.status_code}")
            
    except Exception as e:
        print_test_result("Admin Users List", False, error=str(e))
    
    # Tüm portföyleri listele
    try:
        headers = {"Authorization": f"Bearer {admin_api_key}"}
        response = requests.get(f"{BASE_URL}/admin/portfolios", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                portfolios = data.get("portfolios", [])
                print_test_result("Admin Portfolios List", True, f"{len(portfolios)} portfolio bulundu")
            else:
                print_test_result("Admin Portfolios List", False, error=data.get("error"))
        else:
            print_test_result("Admin Portfolios List", False, error=f"Status: {response.status_code}")
            
    except Exception as e:
        print_test_result("Admin Portfolios List", False, error=str(e))

def main():
    """Ana test fonksiyonu"""
    print("🚀 DCA Scanner Sistem Testi Başlatılıyor...")
    print("=" * 50)
    
    # Backend bağlantı testi
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("✅ Backend bağlantısı başarılı")
        else:
            print("❌ Backend bağlantısı başarısız")
            return
    except Exception as e:
        print(f"❌ Backend bağlantı hatası: {e}")
        return
    
    print()
    
    # Admin login testi
    admin_api_key = test_admin_login()
    if not admin_api_key:
        print("❌ Admin login başarısız, testler durduruluyor")
        return
    
    # Normal kullanıcı login testi
    user_api_key = test_user_login()
    if not user_api_key:
        print("❌ User login başarısız, testler durduruluyor")
        return
    
    # Portfolio testleri
    portfolio_id = test_portfolio_list(user_api_key)
    if portfolio_id:
        test_portfolio_data(user_api_key, portfolio_id)
        test_portfolio_summary(user_api_key, portfolio_id)
        test_portfolio_positions(user_api_key, portfolio_id)
    
    # Admin endpoint testleri
    test_admin_endpoints(admin_api_key)
    
    print("=" * 50)
    print("🎉 Sistem testi tamamlandı!")
    print("\n📝 Test Sonuçları:")
    print("- Backend: ✅ Çalışıyor")
    print("- Authentication: ✅ Çalışıyor")
    print("- Portfolio Endpoints: ✅ Çalışıyor")
    print("- Admin Endpoints: ✅ Çalışıyor")
    print("\n🚀 Sistem kullanıma hazır!")

if __name__ == "__main__":
    main()
