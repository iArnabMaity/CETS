import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

# 1. Load the secure credentials from .env
load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")

if not MONGO_URL:
    print("❌ Error: MONGO_URL not found in .env file. Please check your .env setup.")
    exit()

# 2. Connect to MongoDB Atlas
print("🔄 Connecting to MongoDB Atlas...")
client = MongoClient(MONGO_URL)

# You can name the database and collection whatever you prefer!
db = client["cets_database"]      
collection = db["professionals"]  

# 3. THE CLEANUP: Nuke the old data
print("🧹 Cleaning out old database records...")
deleted_result = collection.delete_many({})
print(f"🗑️ Wiped {deleted_result.deleted_count} old records from the collection.")

# 4. Load the massive JSON file into memory
resource_dir = r"D:\Adamas University\Major Project\Resource"
json_path = os.path.join(resource_dir, "CETS_Master_Database.json")

print(f"\n📂 Loading new dataset from {json_path}...")
try:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    print("❌ Error: Could not find CETS_Master_Database.json. Did you run the processor script?")
    exit()

total_records = len(data)
print(f"📦 Found {total_records} profiles to insert.")

# 5. THE BATCH UPLOAD: Protect the free-tier cloud cluster
# We upload 2,000 at a time so Atlas doesn't throw a "Payload Too Large" error
BATCH_SIZE = 5000
inserted_count = 0

print("\n🚀 Starting batch upload to the cloud...")
for i in range(0, total_records, BATCH_SIZE):
    batch = data[i : i + BATCH_SIZE]
    
    # insert_many handles the heavy lifting
    collection.insert_many(batch)
    inserted_count += len(batch)
    
    print(f"✅ Uploaded {inserted_count} / {total_records} profiles...")

print("\n🎉 SUCCESS! Your MongoDB is now perfectly clean and fully populated with the 54k dataset!")