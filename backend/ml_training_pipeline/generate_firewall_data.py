import pandas as pd
import numpy as np
import random

print("🛡️ Simulating network traffic for the 54k CETS Database...")

n_samples = 10000
data = []

# Simulating normal traffic vs mass-scraping botnet attacks
for _ in range(n_samples):
    is_attack = random.random() < 0.15  # 15% of traffic is malicious

    if not is_attack:
        # NORMAL TRAFFIC: An employer fetching a single employee profile
        country = random.choice(['India', 'Japan', 'Denmark', 'USA', 'Brazil'])
        latency = int(np.random.normal(45, 10))       # Normal ping (ms)
        packet_size = int(np.random.normal(3000, 500)) # Size of one MongoDB JSON profile
        login_attempts = random.randint(1, 3)
        error_rate = abs(np.random.normal(0.01, 0.005)) 
    else:
        # ATTACK TRAFFIC: A scraper bot trying to steal all 54,000 profiles
        country = random.choice(['Unknown', 'Russia', 'China', 'Brazil']) 
        latency = int(np.random.normal(800, 200))      # High latency / VPN routing
        packet_size = int(np.random.normal(95000, 10000)) # Weird packet sizes / Mass data pull
        login_attempts = random.randint(20, 100)       # Brute force API hits
        error_rate = abs(np.random.normal(0.85, 0.1))  # Triggering many 404 Not Found errors

    data.append([latency, packet_size, login_attempts, error_rate, country, -1 if is_attack else 1])

# Create the dataframe and save it
df = pd.DataFrame(data, columns=['latency', 'packet_size', 'login_attempts', 'error_rate', 'country', 'label'])
df.to_csv('firewall_network_logs.csv', index=False)

print("✅ Created 'firewall_network_logs.csv' with 10,000 simulated requests.")