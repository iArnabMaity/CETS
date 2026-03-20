import asyncio
import os
import bcrypt
import motor.motor_asyncio
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")

async def generate_next_id(counters_collection, role):
    prefix = "COMP_" if role == "employer" else "EMP_"
    counter_id = "employer_id" if role == "employer" else "employee_id"
    
    result = await counters_collection.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        return_document=True
    )
    return f"{prefix}{result['seq']}"

def get_password_hash(password):
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_password.decode('utf-8')

async def load_employers():
    if not MONGO_URL:
        print("CRITICAL: MONGO_URL not found in .env file!")
        return

    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
        db = client["cets_database"]
        users_collection = db["users"]
        counters_collection = db["counters"]
    except Exception as e:
        print(f"CRITICAL: Failed to connect to MongoDB: {e}")
        return

    script_dir = os.path.dirname(os.path.abspath(__file__))
    cheat_sheet_path = os.path.join(script_dir, "employer_cheat_sheet.txt")
    if not os.path.exists(cheat_sheet_path):
        print(f"CRITICAL: {cheat_sheet_path} not found!")
        return

    print("Fetching universal password hash...")
    universal_password_hash = get_password_hash("Password@123")
    
    count = 0
    updated = 0
    print("Starting process...")
    
    with open(cheat_sheet_path, "r") as f:
        lines = f.readlines()

    for line in lines:
        if not line.strip(): continue
        # Match pattern like "Company: Shaw-Wheeler | Login: employer_1@test.com"
        match = re.search(r"Company:\s*(.*?)\s*\|\s*Login:\s*(.*)", line)
        if match:
            company_name = match.group(1).strip()
            email = match.group(2).strip().lower() # Normalize email

            # Check if user already exists
            existing = await users_collection.find_one({"email": email})
            if not existing:
                new_id = await generate_next_id(counters_collection, "employer")
                user_doc = {
                    "employer_id": new_id,
                    "name": company_name,
                    "company_name": company_name,
                    "email": email,
                    "password": universal_password_hash,
                    "role": "employer",
                    "about": "",
                    "email_verified": False,
                    "phone_verified": False,
                    "name_dob_locked": False,
                    "name_edits_remaining": 5,
                    "dob_edits_remaining": 3,
                    "company_name_edits_remaining": 1,
                    "establishment_year_edits_remaining": 1,
                    "created_at": "2026-03-17T00:00:00Z"
                }
                await users_collection.insert_one(user_doc)
                print(f"Added company: {company_name} ({email}) with ID: {new_id}")
                count += 1
            else:
                # Update existing user if they are missing employer_id or company_name
                updates = {}
                if not existing.get("employer_id"):
                    # For existing records missing employer_id, we should decide if we generate one
                    # Usually, we'd want to keep the one they already have if it's in 'id'
                    if existing.get("id"):
                        updates["employer_id"] = existing.get("id")
                    else:
                        updates["employer_id"] = await generate_next_id(counters_collection, "employer")
                
                if not existing.get("company_name"):
                    updates["company_name"] = company_name

                if updates:
                    await users_collection.update_one({"email": email}, {"$set": updates})
                    print(f"Updated existing company: {email} with fields: {list(updates.keys())}")
                    updated += 1

    print(f"Process complete. Added {count} new employers, updated {updated} existing records.")

if __name__ == "__main__":
    asyncio.run(load_employers())
