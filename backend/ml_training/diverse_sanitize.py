import os
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from faker import Faker
import random
from pymongo import UpdateOne

load_dotenv()

# Initialize diverse Fakers
fake_in = Faker('en_IN')
fake_us = Faker('en_US')
fake_uk = Faker('en_GB')

async def sanitize_with_diversity():
    # 1. Database Connection
    MONGO_URL = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["cets_database"] # Ensure this matches your DB name
    
    print("🌍 Connecting to CETS Database...")
    
    # 2. Universal Password Setup
    GENERIC_PASSWORD = "Password@123"
    hashed_pwd = bcrypt.hashpw(GENERIC_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    professionals_col = db["professionals"]
    users_col = db["users"]

    # 3. Process in Batches (Important for 54k records)
    cursor = professionals_col.find({})
    batch_size = 1000
    updates_prof = []
    updates_user = []
    count = 0

    print("🚀 Starting Global Sanitization...")

    async for emp in cursor:
        emp_id = emp.get("employee_id")
        if not emp_id: continue

        # Pick random diverse name
        picker = random.random()
        if picker < 0.5: random_name = fake_in.name()
        elif picker < 0.8: random_name = fake_us.name()
        else: random_name = fake_uk.name()

        generic_email = f"{emp_id.lower()}@test.com"

        # Prepare Bulk Update for Professionals
        updates_prof.append(
            UpdateOne({"_id": emp["_id"]}, {"$set": {"name": random_name, "email": generic_email}})
        )

        # Prepare Bulk Update for Users (Login Hub)
        updates_user.append(
            UpdateOne(
                {"employee_id": emp_id}, 
                {"$set": {
                    "name": random_name,
                    "email": generic_email,
                    "password": hashed_pwd,
                    "role": "employee",
                    "employee_id": emp_id
                }}, 
                upsert=True
            )
        )

        count += 1
        
        # Execute batch when it reaches the limit
        if len(updates_prof) >= batch_size:
            await professionals_col.bulk_write(updates_prof)
            await users_col.bulk_write(updates_user)
            updates_prof = []
            updates_user = []
            print(f"✅ Processed {count} / 54,000 records...")

    # Final batch
    if updates_prof:
        await professionals_col.bulk_write(updates_prof)
        await users_col.bulk_write(updates_user)

    print(f"\n✨ SUCCESS: {count} unique profiles created.")
    print(f"🔑 All employees can login with: [emp_id]@test.com / {GENERIC_PASSWORD}")

if __name__ == "__main__":
    asyncio.run(sanitize_with_diversity())