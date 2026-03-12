import hashlib
import os
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient

def generate_blockchain_hash(data_string: str) -> str:
    return hashlib.sha256(data_string.encode()).hexdigest()

def fix_blockchain_data():
    print("🔒 Connecting to Atlas to backfill blockchain hashes...")
    load_dotenv()
    MONGO_URL = os.getenv("MONGO_URL")
    
    if not MONGO_URL:
        print("❌ Error: MONGO_URL not found in .env file.")
        return

    client = MongoClient(MONGO_URL)
    db = client["cets_database"]
    
    cursor = db.professionals.find({})
    total_profs = db.professionals.count_documents({})
    fixed_profs = 0
    total_experience_fixed = 0

    print(f"🔄 Processing {total_profs} professional profiles...")

    for prof in cursor:
        emp_id = prof.get("employee_id")
        experience = prof.get("experience", [])
        needs_update = False
        
        for exp in experience:
            # Check if hash is missing or obviously placeholder (zeros/empty)
            curr_hash = exp.get("blockchain_hash", "")
            is_verified = exp.get("is_verified", False)
            
            # Condition: Past jobs should be verified. 
            # Current jobs (Present) might already have a hash from onboarding, 
            # but we ensure consistency.
            if not curr_hash or curr_hash == "0" or not is_verified:
                firm = exp.get("firm", "Unknown")
                role = exp.get("role", "Unknown")
                start_date = exp.get("start_date", "Unknown")
                
                # Standard hash format used in main.py logic
                # SHA256(employee_id | firm | role | start_date)
                data_string = f"{emp_id}|{firm}|{role}|{start_date}"
                new_hash = generate_blockchain_hash(data_string)
                
                exp["blockchain_hash"] = new_hash
                exp["is_verified"] = True
                needs_update = True
                total_experience_fixed += 1

        if needs_update:
            db.professionals.update_one(
                {"_id": prof["_id"]},
                {"$set": {"experience": experience}}
            )
            fixed_profs += 1

    print(f"✅ SUCCESS!")
    print(f"📊 Summary:")
    print(f"   - Profiles Checked: {total_profs}")
    print(f"   - Profiles Updated: {fixed_profs}")
    print(f"   - Experience Records Hashed: {total_experience_fixed}")

if __name__ == "__main__":
    fix_blockchain_data()
