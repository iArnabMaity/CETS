import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def build_indexes():
    print("⚡ Connecting to Atlas to build high-speed indexes...")
    client = AsyncIOMotorClient("mongodb+srv://iarnabmaity:ibnxqdRUhUhkhZby@cluster0.0rbb3xt.mongodb.net/?appName=Cluster0")
    db = client["cets_database"]

    # 1. Index the users collection for lightning-fast logins
    print("🔍 Optimizing 'users' collection (Logins)...")
    await db.users.create_index("email", unique=True)
    
    # 2. Index the professional/employer IDs for fast dashboard loading
    print("🔍 Optimizing 'professionals' collection (Dashboards)...")
    await db.professionals.create_index("employee_id", unique=True)
    
    print("🚀 SUCCESS! Database optimization complete. Logins should be instant now.")

if __name__ == "__main__":
    asyncio.run(build_indexes())