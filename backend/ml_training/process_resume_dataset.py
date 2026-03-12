import pandas as pd
import json
import hashlib
import random
import os

# Pointing exactly to your root Resource folder
resource_dir = r"D:\Adamas University\Major Project\Resource"

def generate_eth_wallet():
    return "0x" + "".join(random.choices("0123456789abcdef", k=40))

def generate_sha256_hash(data_string):
    """Creates the cryptographic proof for the blockchain"""
    return "0x" + hashlib.sha256(data_string.encode()).hexdigest()

print(f"🔄 Reading the Resume dataset from {resource_dir}...\n")

try:
    # UPDATED: Using your exact new file names
    people_df = pd.read_csv(os.path.join(resource_dir, "people.csv"))
    experience_df = pd.read_csv(os.path.join(resource_dir, "experience.csv"))
    education_df = pd.read_csv(os.path.join(resource_dir, "education.csv"))
    skills_df = pd.read_csv(os.path.join(resource_dir, "personal skills.csv")) 
    abilities_df = pd.read_csv(os.path.join(resource_dir, "abilities.csv"))
    
    print("⚙️ Linking relational data and generating Blockchain Hashes...")
    
    database = []

    for index, person in people_df.iterrows():
        pid = person['person_id']

        # 1. Grab all related data for this specific person
        person_exp = experience_df[experience_df['person_id'] == pid]
        person_edu = education_df[education_df['person_id'] == pid]
        person_abil = abilities_df[abilities_df['person_id'] == pid]['ability'].dropna().tolist()
        person_skills = skills_df[skills_df['person_id'] == pid]['skill'].dropna().tolist()

        # 2. Process Experience & Hash it
        exp_list = []
        for _, exp in person_exp.iterrows():
            firm = str(exp.get('firm', 'Independent'))
            title = str(exp.get('title', 'Professional'))
            start = str(exp.get('start_date', 'Unknown'))
            end = str(exp.get('end_date', 'Present'))
            
            # The Blockchain Link
            record_hash = generate_sha256_hash(f"{pid}{firm}{title}{start}{end}")
            exp_list.append({
                "firm": firm,
                "title": title,
                "start_date": start,
                "end_date": end,
                "blockchain_hash": record_hash
            })

        # 3. Process Education & Hash it
        edu_list = []
        for _, edu in person_edu.iterrows():
            inst = str(edu.get('institution', 'Unknown'))
            prog = str(edu.get('program', 'Degree'))
            start = str(edu.get('start_date', 'Unknown'))
            
            # The Blockchain Link
            record_hash = generate_sha256_hash(f"{pid}{inst}{prog}{start}")
            edu_list.append({
                "institution": inst,
                "program": prog,
                "start_date": start,
                "blockchain_hash": record_hash
            })

        # 4. Construct the final MongoDB Document
        doc = {
            "employee_id": f"EMP_{pid}",
            "name": str(person.get('name', f"Professional_{pid}")),
            "email": str(person.get('email', f"user{pid}@example.com")),
            "wallet_address": generate_eth_wallet(),
            "experience": exp_list,
            "education": edu_list,
            "skills": person_skills,
            "abilities": person_abil
        }
        database.append(doc)

    # 5. Save the final nested JSON
    output_file = os.path.join(resource_dir, "CETS_Master_Database.json")
    with open(output_file, "w") as f:
        json.dump(database, f, indent=4)

    print(f"\n🚀 SUCCESS! Merged {len(database)} complete profiles into '{output_file}'")
    print("Your relational data is now a NoSQL document ready for MongoDB Atlas!")

except FileNotFoundError as e:
    print(f"\n❌ Error: Could not find one of the CSV files. Please check the names.")
    print(f"Details: {e}")