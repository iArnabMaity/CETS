import requests
import json
import time
import random
import concurrent.futures

BASE_URL = "http://127.0.0.1:8000"  # Update if your backend runs elsewhere

def test_volumetric_attack():
    """Simulates a large packet size attack."""
    print("\n🚀 Testing Volumetric Attack (Large Packet)...")
    payload = {
        "email": "test@attacker.com",
        "password": "password123",
        "packet_size": 60000.0,  # Threshold is 50,000
    }
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

def test_brute_force_firewall():
    """Simulates high login attempts reported in payload."""
    print("\n🚀 Testing Intrusion Attempt (High Login Attempts)...")
    payload = {
        "email": "victim@cets.com",
        "password": "wrongpassword",
        "login_attempts": 15,  # Threshold is 10
    }
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

def test_behavioral_anomaly():
    """Simulates bot-like behavior (high typing speed, no mouse)."""
    print("\n🚀 Testing Behavioral Anomaly (Bot-like Input)...")
    payload = {
        "email": "admin@cets.com",
        "password": "wrongpassword",
        "typing_speed": 200.0, # Threshold is 150
        "mouse_distance": 0,
        "mouse_clicks": 0,
        "local_hour": 3,       # Late night hour
        "local_minute": 30
    }
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=5)
        print(f"Status Code: {response.status_code}")
        print("Check Admin Dashboard for a 'BH-' threat log.")
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")

def send_dos_request(ip_spoof=None):
    """Sends a minimal login request, optionally spoofing the IP via headers."""
    headers = {"X-Forwarded-For": ip_spoof} if ip_spoof else {}
    payload = {"email": "ddos@cets.com", "password": "load_test"}
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload, headers=headers, timeout=2)
        return response.status_code
    except requests.exceptions.RequestException:
        return "TIMEOUT/FAIL"

def test_dos_attack():
    """Simulates a rapid Denial of Service (DoS) attack from a single host."""
    print("\n🚀 Testing DoS Attack (Rapid-fire originating from single source)...")
    requests_to_send = 50
    success = 0
    blocked_or_failed = 0
    
    start_time = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(send_dos_request) for _ in range(requests_to_send)]
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if str(res).startswith('2'):
                success += 1
            else:
                blocked_or_failed += 1
                
    duration = time.time() - start_time
    print(f"Finished {requests_to_send} requests in {duration:.2f}s")
    print(f"Success/Allowed: {success} | Blocked/Failed: {blocked_or_failed}")
    if blocked_or_failed > 0:
        print("✅ The firewall rate-limiter effectively disrupted the DoS attempt.")

def test_ddos_attack():
    """Simulates a Distributed Denial of Service (DDoS) attack using spoofed IPs."""
    print("\n🚀 Testing DDoS Attack (Simulated Distributed Source Vectors)...")
    requests_to_send = 100
    success = 0
    blocked_or_failed = 0
    
    # Generate random spoofed IP addresses to simulate a botnet
    spoofed_ips = [f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}" for _ in range(requests_to_send)]
    
    start_time = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(send_dos_request, spoofed_ips[i]) for i in range(requests_to_send)]
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if str(res).startswith('2'):
                success += 1
            else:
                blocked_or_failed += 1
                
    duration = time.time() - start_time
    print(f"Finished {requests_to_send} requests in {duration:.2f}s")
    print(f"Success/Allowed: {success} | Blocked/Failed: {blocked_or_failed}")
    print("Check Admin Dashboard Traffic Analytics for volumetric anomalies.")

if __name__ == "__main__":
    print("🛠️ CETS Advanced Threat Simulator Initialized")
    try:
        test_volumetric_attack()
        time.sleep(1)
        test_brute_force_firewall()
        time.sleep(1)
        test_behavioral_anomaly()
        time.sleep(2)
        test_dos_attack()
        time.sleep(2)
        test_ddos_attack()
    except Exception as e:
        print(f"Error executing threat simulation: {e}")

