import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os

def train_cognitive_firewall():
    print("🛡️ Initializing Cognitive Firewall Training Protocol...")

    # 1. Load the dataset
    csv_path = "firewall_network_logs.csv"
    if not os.path.exists(csv_path):
        print(f"❌ Error: Could not find '{csv_path}'. Make sure you generate the data first!")
        return

    print("📥 Loading network traffic dataset...")
    df = pd.read_csv(csv_path)

    # 2. Feature Engineering & Preprocessing
    print("⚙️ Processing features (Latency, Packet Size, Error Rates)...")
    
    # If there's a label column from the generator, we drop it for unsupervised anomaly detection
    if 'is_threat' in df.columns:
        X = df.drop('is_threat', axis=1)
    else:
        X = df.copy()

    # Convert categorical 'country' into numerical columns (e.g., country_India, country_USA)
    if 'country' in X.columns:
        X = pd.get_dummies(X, columns=['country'], dummy_na=False)

    # Save the exact feature column names so main.py knows what shape the data should be
    features = X.columns.tolist()
    joblib.dump(features, "firewall_features.joblib")

    # Scale the numerical data so massive packet sizes don't outweigh tiny error rates
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    joblib.dump(scaler, "firewall_scaler.joblib")

    # 3. Train the AI Brain (Isolation Forest)
    print("🧠 Training Machine Learning Model for Anomaly Detection...")
    # contamination=0.05 means we assume roughly 5% of our training data might be attacks
    firewall_model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    firewall_model.fit(X_scaled)

    # 4. Export the Model
    joblib.dump(firewall_model, "cognitive_firewall.joblib")
    print("✅ Training Complete! New '.joblib' brain files have been generated.")

if __name__ == "__main__":
    train_cognitive_firewall()