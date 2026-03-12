import os
import asyncio
import random
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from faker import Faker
from pymongo import UpdateOne

load_dotenv()

fake_in = Faker('en_IN')
fake_us = Faker('en_US')
fake_uk = Faker('en_GB')

async def intelligent_mapping():
    MONGO_URL = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["cets_database"]
    professionals_col = db["professionals"]
    
    print("🌍 Step 1: Generating pool of 2,000 global corporate names...")
    fake_pool = set()
    while len(fake_pool) < 2000:
        picker = random.random()
        if picker < 0.5: fake_pool.add(fake_in.company())
        elif picker < 0.8: fake_pool.add(fake_us.company())
        else: fake_pool.add(fake_uk.company())
    
    fake_pool = list(fake_pool)

    print("⚖️ Step 2: Applying Real-World Market Distribution (Zipf's Law)...")
    # This creates a curve where the first few companies have massive weights (Tech Giants)
    # and the rest taper off into smaller startups.
    weights = [1.0 / ((i + 1) ** 0.6) for i in range(len(fake_pool))]

    print("🔍 Step 3: Extracting original unique companies...")
    pipeline = [{"$unwind": "$experience"}, {"$group": {"_id": "$experience.firm"}}]
    results = await professionals_col.aggregate(pipeline).to_list(length=20000)
    original_firms = [doc["_id"] for doc in results if doc["_id"]]
    
    print("🔗 Step 4: Creating Global Weighted Mapping...")
    firm_mapping = {}
    for old_firm in original_firms:
        # Assign fake company based on market weights
        firm_mapping[old_firm] = random.choices(fake_pool, weights=weights, k=1)[0]

    print("🚀 Step 5: Processing 54,935 Employees with Collision Detection...")
    cursor = professionals_col.find({})
    batch_size = 5000
    updates = []
    count = 0

    async for emp in cursor:
        experience_list = emp.get("experience", [])
        seen_fake_firms = set() # Memory to track this specific employee's timeline
        modified = False
        
        for exp in experience_list:
            old_firm = exp.get("firm")
            fake_firm = firm_mapping.get(old_firm)
            
            # --- COLLISION DETECTION LOGIC ---
            # If they already worked at this fake company, fallback to a new one
            while fake_firm in seen_fake_firms or not fake_firm:
                fake_firm = random.choices(fake_pool, weights=weights, k=1)[0]
                
            seen_fake_firms.add(fake_firm)
            exp["firm"] = fake_firm
            
            # Clean up date formats silently
            exp["start_date"] = str(exp.get("start_date", "")).strip()
            exp["end_date"] = str(exp.get("end_date", "")).strip()
            modified = True
                
        if modified:
            updates.append(UpdateOne({"_id": emp["_id"]}, {"$set": {"experience": experience_list}}))

        count += 1
        if len(updates) >= batch_size:
            await professionals_col.bulk_write(updates)
            updates = []
            print(f"✅ Mapped {count} / 54,000 records safely...")

    if updates:
        await professionals_col.bulk_write(updates)

    print(f"\n✨ SUCCESS: Your data is now perfectly balanced and collision-free!")

if __name__ == "__main__":
    asyncio.run(intelligent_mapping())