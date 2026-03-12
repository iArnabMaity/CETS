from pymongo import MongoClient

print("🔒 Connecting to Atlas to scrub overlapping jobs...")
client = MongoClient("mongodb+srv://iarnabmaity:ibnxqdRUhUhkhZby@cluster0.0rbb3xt.mongodb.net/?appName=Cluster0")
db = client["cets_database"]

cursor = db.professionals.find({})
fixed_count = 0

for prof in cursor:
    exp_list = prof.get("experience", [])
    if len(exp_list) <= 1: 
        continue

    needs_fix = False
    
    # Sort chronologically (oldest to newest) to identify the true current job
    exp_list.sort(key=lambda x: x.get('start_date', '9999-99-99'))

    # Every job EXCEPT the very last one cannot be "Present"
    for i in range(len(exp_list) - 1):
        end = str(exp_list[i].get('end_date', '')).strip().lower()
        if end in ['present', 'nan', '', 'none', 'null']:
            # Cap the ghost job's end date to the start date of their NEXT job
            next_start = exp_list[i+1].get('start_date', '2026-03-01')
            exp_list[i]['end_date'] = next_start
            needs_fix = True

    if needs_fix:
        # Reverse back to standard newest-first resume format
        exp_list.reverse()
        db.professionals.update_one(
            {"_id": prof["_id"]}, 
            {"$set": {"experience": exp_list}}
        )
        fixed_count += 1

print(f"✅ Ghost jobs scrubbed! Fixed {fixed_count} overlapping timelines.")