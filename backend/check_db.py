import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check_db():
    load_dotenv()
    mongo_url = os.getenv('MONGO_URL')
    if not mongo_url:
        print("MONGO_URL not found")
        return
    try:
        client = AsyncIOMotorClient(mongo_url)
        await client.admin.command('ping')
        print("Connected to MongoDB")
        db = client['cets_database']
        users = await db['users'].count_documents({})
        print(f"Users in DB: {users}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
