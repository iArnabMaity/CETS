import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def export_company_list():
    MONGO_URL = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["cets_database"]
    professionals_col = db["professionals"]
    
    print("🔍 Scanning database for all unique corporate entities...")
    
    # Aggregation to find all unique companies and count how many employees they have
    pipeline = [
        {"$unwind": "$experience"},
        {"$group": {"_id": "$experience.firm", "employee_count": {"$sum": 1}}},
        {"$sort": {"employee_count": -1}}  # Sort by most employees to least
    ]
    
    results = await professionals_col.aggregate(pipeline).to_list(length=5000)
    
    # Filter out any empty/None values just in case
    companies = [doc for doc in results if doc["_id"]]
    
    # 1. Save the full list to a text file
    with open("cets_company_list.txt", "w", encoding="utf-8") as f:
        f.write(f"--- FULL CETS CORPORATE DIRECTORY ({len(companies)} Companies) ---\n\n")
        for idx, comp in enumerate(companies, 1):
            f.write(f"{idx}. {comp['_id']} (Employees: {comp['employee_count']})\n")
            
    # 2. Print the Top 15 to the terminal so you can see them immediately
    print(f"\n✅ Successfully extracted {len(companies)} unique companies.")
    print("📂 Full list saved to 'cets_company_list.txt'")
    print("\n🏆 TOP 15 LARGEST COMPANIES IN YOUR DATABASE:")
    print("-" * 50)
    for comp in companies[:15]:
        print(f"🏢 {comp['_id']} | 👥 {comp['employee_count']} employees")
    print("-" * 50)

if __name__ == "__main__":
    asyncio.run(export_company_list())