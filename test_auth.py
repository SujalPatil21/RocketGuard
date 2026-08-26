import requests
import sys

BASE = "http://localhost:8000"

def test():
    # 1. Registration
    print("1. Registration...")
    res = requests.post(f"{BASE}/auth/register", json={
        "email": "testuser99@example.com",
        "password": "Password123!",
        "full_name": "Test User"
    })
    print(res.status_code, res.json())
    
    # We might not easily get the OTP from SMTP programmatically unless we check logs.
    # Actually, if the backend uses sqlite, we can read the OTP from the db or skip if we only test login.
    # The instructions say:
    # 3. login with email/password
    # Let's try to login without verifying OTP first? No, registration might require OTP verify before login.
    # If the user is seeded (admin@example.com), we can just test login with it.
    
    print("\n3. Login...")
    res = requests.post(f"{BASE}/auth/login", json={
        "email": "demo@apsentinel.com",
        "password": "Demo@Sentinel1!"
    })
    print(res.status_code, res.json())
    
    if res.status_code == 200:
        data = res.json().get("data", {})
        token = data.get("access_token")
        if token:
            print("JWT returned:", token[:10] + "...")
            
            headers = {"Authorization": f"Bearer {token}"}
            print("\n5. /auth/me")
            res_me = requests.get(f"{BASE}/auth/me", headers=headers)
            print(res_me.status_code)
            
            print("\n6. /api/payments")
            res_pay = requests.get(f"{BASE}/api/payments", headers=headers)
            print(res_pay.status_code)
            
            print("\n7. Logout / Unauth request")
            res_unauth = requests.get(f"{BASE}/api/payments")
            print("Unauth payments:", res_unauth.status_code)
            
if __name__ == "__main__":
    test()
