import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def get_unique_employers():
    MONGO_URL = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["cets_database"]
    
    print("🔍 Extracting unique employers from 54k records...")
    
    # Using MongoDB Aggregation to find unique 'firm' names within the experience array
    pipeline = [
        {"$unwind": "$experience"},
        {"$group": {"_id": "$experience.firm"}},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db["professionals"].aggregate(pipeline).to_list(length=10000)
    
    employers = [doc["_id"] for doc in results if doc["_id"] and str(doc["_id"]).lower() != "nan"]
    
    # Save to a text file for your reference
    with open("unique_employers.txt", "w", encoding="utf-8") as f:
        for emp in employers:
            f.write(f"{emp}\n")
            
    print(f"✅ Found {len(employers)} unique employer names.")
    print("📂 All names have been saved to 'unique_employers.txt'.")

if __name__ == "__main__":
    asyncio.run(get_unique_employers())