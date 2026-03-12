import os
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pymongo import UpdateOne
from datetime import datetime, timezone

load_dotenv()

async def register_all_employers():
    print("🔒 Connecting to Atlas using Async Motor Client...")
    
    # THE FIX: Using AsyncIOMotorClient instead of MongoClient
    client = AsyncIOMotorClient("mongodb+srv://iarnabmaity:ibnxqdRUhUhkhZby@cluster0.0rbb3xt.mongodb.net/?appName=Cluster0")
    db = client["cets_database"]
    
    print("🔍 Extracting all unique companies from the 54k database...")
    
    # Get all unique companies
    pipeline = [
        {"$unwind": "$experience"},
        {"$group": {"_id": "$experience.firm"}}
    ]
    
    # 'await' works perfectly here now because of the Motor client
    results = await db["professionals"].aggregate(pipeline).to_list(length=5000)
    companies = [doc["_id"] for doc in results if doc["_id"]]
    
    print(f"🏢 Found {len(companies)} companies. Generating generic accounts...")

    # Universal Password
    GENERIC_PASSWORD = "Password@123"
    hashed_pwd = bcrypt.hashpw(GENERIC_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    users_col = db["users"]
    updates = []
    
    # We will write these to a file so you know who is who!
    cheat_sheet_lines = ["--- CETS EMPLOYER LOGIN CHEAT SHEET ---\n", f"Universal Password: {GENERIC_PASSWORD}\n\n"]

    for idx, company in enumerate(companies, 1):
        generic_email = f"employer_{idx}@test.com"
        employer_id = f"COMP_{1000 + idx}"
        
        user_doc = {
            "name": f"{company} HR",
            "email": generic_email,
            "password": hashed_pwd,
            "role": "employer",
            "employer_id": employer_id,
            "company_name": company,
            "about": f"Welcome to the official HR portal for {company}.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        updates.append(UpdateOne({"email": generic_email}, {"$set": user_doc}, upsert=True))
        cheat_sheet_lines.append(f"Company: {company.ljust(40)} | Login: {generic_email}")

        if len(updates) >= 500:
            await users_col.bulk_write(updates)
            updates = []
            print(f"✅ Registered {idx} / {len(companies)} employers...")

    if updates:
        await users_col.bulk_write(updates)

    # Save the cheat sheet
    with open("employer_cheat_sheet.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(cheat_sheet_lines))

    print(f"\n✨ SUCCESS: {len(companies)} generic employer accounts created!")
    print(f"📂 Open 'employer_cheat_sheet.txt' to see your logins.")
    print(f"🔑 Try logging in right now with: employer_1@test.com / {GENERIC_PASSWORD}")

if __name__ == "__main__":
    asyncio.run(register_all_employers())