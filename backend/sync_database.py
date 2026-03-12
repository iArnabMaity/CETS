import random
from pymongo import MongoClient, UpdateOne
from faker import Faker

fake = Faker('en_IN')

# --- 1. CONNECTION ---
print("🔒 Connecting to Atlas for Final Master Sync...")
client = MongoClient("mongodb+srv://iarnabmaity:ibnxqdRUhUhkhZby@cluster0.0rbb3xt.mongodb.net/?appName=Cluster0")
db = client["cets_database"]

BATCH_SIZE = 1000
total_records = db.professionals.count_documents({})
processed_count = 0
TARGET_MONTHS = 2026 * 12 + 3 # March 2026

# --- 2. FETCH EXISTING EMPLOYERS ---
print("🏢 Fetching your pre-registered Employer profiles from the users collection...")
valid_employers = list(db.users.find({"role": "employer"}, {"company_name": 1, "_id": 0}))
valid_company_names = [emp.get("company_name") for emp in valid_employers if emp.get("company_name")]

if not valid_company_names:
    raise ValueError("🚨 CRITICAL ERROR: No employers found in the database. Run register_employers.py first.")

print(f"✅ Successfully loaded {len(valid_company_names)} authentic companies for transaction mapping.")

# --- 3. MATRICES & PREFIXES ---
UG_DEGREES = ["B.Tech", "BCA", "B.Sc", "B.Com", "BBA", "BA"]
PG_DEGREES = ["MCA", "M.Tech", "MBA", "M.Sc", "MA"]
UNIV_TYPES = ["University", "Institute of Technology", "College"]
SCHOOL_TYPES = ["Public School", "High School", "Academy"]

ENTRY_PREFIXES = ["Junior", "Assistant", "Associate", "Trainee"]
SENIOR_PREFIXES = ["Senior", "Lead", "Chief", "Principal", "Head of"]

def parse_to_months(date_str):
    try:
        if '/' in date_str:
            m, y = date_str.split('/')
            return int(y) * 12 + int(m)
        elif '-' in date_str:
            parts = date_str.split('-')
            return int(parts[0]) * 12 + int(parts[1])
    except: return 0
    return 0

def months_to_date(total_months):
    y = total_months // 12
    m = total_months % 12
    if m == 0: m, y = 12, y - 1
    return f"{y}-{m:02d}-01"

# --- 4. THE MASTER LOOP ---
while processed_count < total_records:
    cursor = db.professionals.find({}).skip(processed_count).limit(BATCH_SIZE)
    prof_bulk_ops = []
    user_bulk_ops = []

    for prof in cursor:
        emp_id = prof.get("employee_id")
        exp_list = prof.get("experience", [])
        
        # ---------------------------------------------------------
        # THE FRESHER FIX
        # ---------------------------------------------------------
        if not exp_list or len(exp_list) == 0:
            exp_list = [{
                "start_date": f"2025-{random.randint(1, 12):02d}-01",
                "end_date": "Present",
                "role": "Temp",
                "firm": "Temp"
            }]
        
        # ---------------------------------------------------------
        # EXACT MONTH-LEVEL TIMELINE SHIFT
        # ---------------------------------------------------------
        person_max_months = 0
        for exp in exp_list:
            end_str = str(exp.get('end_date', '')).strip()
            if end_str.lower() not in ['present', 'nan', 'none', 'null', '']:
                months = parse_to_months(end_str)
                if months > person_max_months: person_max_months = months
        
        delta_months = TARGET_MONTHS - person_max_months if person_max_months > 0 else 0
        shifted_exp = []
        first_job_year = 2026
        
        # Apply the exact shift to all dates first
        for e in exp_list:
            for key in ['start_date', 'end_date']:
                val_str = str(e.get(key, '')).strip()
                if val_str.lower() not in ['present', 'nan', 'none', 'null', '']:
                    current_months = parse_to_months(val_str)
                    if current_months > 0:
                        new_months = current_months + delta_months
                        e[key] = months_to_date(new_months)
                        if key == 'start_date':
                            y = new_months // 12
                            if y < first_job_year: first_job_year = y
            shifted_exp.append(e)

        # ---------------------------------------------------------
        # CHRONOLOGICAL SORTING & ROLE ASSIGNMENT (THE FIX)
        # ---------------------------------------------------------
        # Sort oldest to newest to safely assign Junior/Senior progression
        shifted_exp.sort(key=lambda x: x.get('start_date', '9999-99-99'))

        for i, e in enumerate(shifted_exp):
            e['firm'] = random.choice(valid_company_names)
            base_job = fake.job()

            if i == 0: 
                e['role'] = f"{random.choice(ENTRY_PREFIXES)} {base_job}"
            elif i == len(shifted_exp) - 1: 
                e['role'] = f"{random.choice(SENIOR_PREFIXES)} {base_job}"
                e['end_date'] = "Present" # The chronological LAST job gets Present
            else: 
                e['role'] = base_job

        # Reverse it back to standard "Newest First" resume format
        shifted_exp.reverse()

        # ---------------------------------------------------------
        # GUARANTEED GRADUATE EDUCATION
        # ---------------------------------------------------------
        edu = []
        current_academic_year = first_job_year - random.randint(0, 1)

        if len(exp_list) >= 3 and random.random() < 0.15:
            edu.append({"degree": "Ph.D", "institution": f"IIT {fake.city()}", "year": str(current_academic_year), "score": round(random.uniform(75, 95), 2)})
            current_academic_year -= random.randint(3, 5)

        if (len(exp_list) >= 2 and random.random() < 0.40) or any(d['degree'] == "Ph.D" for d in edu):
            edu.append({"degree": random.choice(PG_DEGREES), "institution": f"NIT {fake.city()}", "year": str(current_academic_year), "score": round(random.uniform(65, 92), 2)})
            current_academic_year -= 2

        ug_year = current_academic_year
        edu.append({"degree": random.choice(UG_DEGREES), "institution": f"{fake.last_name()} {random.choice(UNIV_TYPES)}, {fake.city()}", "year": str(ug_year), "score": round(random.uniform(60, 90), 2)})
        
        c12_year = ug_year - random.choice([3, 4])
        c10_year = c12_year - 2
        edu.append({"degree": "Class 12", "institution": f"{fake.first_name()} {random.choice(SCHOOL_TYPES)}", "year": str(c12_year), "score": round(random.uniform(70, 98), 2)})
        edu.append({"degree": "Class 10", "institution": f"{fake.first_name()} {random.choice(SCHOOL_TYPES)}", "year": str(c10_year), "score": round(random.uniform(75, 99), 2)})

        dob_year = c10_year - random.choice([16, 17])
        dob = f"{dob_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        avg_score = round(sum(d['score'] for d in edu) / len(edu), 2)
        gender = random.choices(["Male", "Female", "Transgender"], weights=[54, 42, 4])[0]

        prof_bulk_ops.append(UpdateOne(
            {"employee_id": emp_id},
            {"$set": {
                "experience": shifted_exp,
                "education": edu,
                "average_academic_score": avg_score,
                "gender": gender,
                "dob": dob
            }}
        ))
        user_bulk_ops.append(UpdateOne({"employee_id": emp_id}, {"$set": {"gender": gender, "dob": dob}}))

    if prof_bulk_ops:
        db.professionals.bulk_write(prof_bulk_ops)
        db.users.bulk_write(user_bulk_ops)
        
    processed_count += len(prof_bulk_ops)
    print(f"✅ Sync Progress: {processed_count} / {total_records} profiles fully updated.")

print(f"🎉 SUCCESS! Freshers upgraded, timelines sorted & shifted to March 2026, and active employment achieved.")