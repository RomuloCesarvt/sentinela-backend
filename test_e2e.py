import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def print_result(step, response):
    status = "SUCCESS" if response.status_code in [200, 201] else f"FAILED ({response.status_code})"
    print(f"[{status}] {step}")
    try:
        print(f"  Response: {response.json()}")
    except:
        print(f"  Response: {response.text}")
    print("-" * 40)

# 1. Health check
res = requests.get(f"{BASE_URL}/health")
print_result("Health Check", res)

# 2. Create User
payload = {"username": "testuser", "password": "123", "name": "Test User", "role": "sdr"}
res = requests.post(f"{BASE_URL}/users", json=payload)
print_result("Create User", res)

# 3. Login
payload = {"username": "testuser", "password": "123"}
res = requests.post(f"{BASE_URL}/auth/login", json=payload)
print_result("Login", res)

# 4. Get Leads (before scan)
res = requests.get(f"{BASE_URL}/leads?username=testuser")
print_result("Get Leads (Pre-scan)", res)

# 5. Trigger Scan
payload = {"username": "testuser", "period": "24h"}
res = requests.post(f"{BASE_URL}/scan", json=payload)
print_result("Trigger Scan", res)

# Wait a moment
time.sleep(5)

# 6. Check Scan Status
res = requests.get(f"{BASE_URL}/scan/status")
print_result("Scan Status", res)

# 7. Get Leads (after trigger)
res = requests.get(f"{BASE_URL}/leads?username=testuser")
print_result("Get Leads (Post-scan)", res)

# Cleanup: Delete the test user
res = requests.delete(f"{BASE_URL}/users/testuser")
print_result("Cleanup Test User", res)
