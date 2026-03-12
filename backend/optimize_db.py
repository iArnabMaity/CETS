import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def build_indexes():
    print("⚡ Connecting to Atlas to build high-speed indexes...")
    import os
    from dotenv import load_dotenv
    from pymongo import MongoClient # or AsyncIOMotorClient
    load_dotenv() # Loads variables from your .env file
    MONGO_URL = os.getenv("MONGO_URL")
    client = MongoClient(MONGO_URL) # Use the variable instead of the hardcoded stringdb = client["cets_database"]

    # 1. Index the users collection for lightning-fast logins
    print("🔍 Optimizing 'users' collection (Logins)...")
    await db.users.create_index("email", unique=True)
    
    # 2. Index the professional/employer IDs for fast dashboard loading
    print("🔍 Optimizing 'professionals' collection (Dashboards)...")
    await db.professionals.create_index("employee_id", unique=True)
    
    print("🚀 SUCCESS! Database optimization complete. Logins should be instant now.")

if __name__ == "__main__":
    asyncio.run(build_indexes())