from fastapi import FastAPI, HTTPException, Query, Path, Request, Response, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import motor.motor_asyncio
import os
from dotenv import load_dotenv
import joblib
import pandas as pd
from datetime import datetime, timezone, timedelta
import hashlib
import bcrypt
import uuid
import re
import jwt
import secrets
from bson.objectid import ObjectId
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import redis.asyncio as redis
import json
from groq import AsyncGroq

# --- Redis Cache Initialization ---
redis_client = None

async def init_redis():
    global redis_client
    try:
        REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
        # decode_responses=True is important for getting strings instead of bytes
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        # Test connection
        await redis_client.ping()
        print("✅ Redis Cache Online")
    except Exception as e:
        print(f"⚠️ Redis Offline (Falling back to DB direct): {e}")
        redis_client = None

# --- 1. Security & Environment Setup ---
load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15

if not MONGO_URL:
    print("❌ ERROR: MONGO_URL not found in environment variables.")
    raise RuntimeError("MONGO_URL is missing from the .env file!")

OPENCLAW_API_KEY = os.getenv("OPENCLAW_API_KEY")
if not OPENCLAW_API_KEY:
    print("❌ ERROR: OPENCLAW_API_KEY not found in environment variables.")
    raise RuntimeError("OPENCLAW_API_KEY is missing from the .env file!")

MCP_TOKEN = os.getenv("MCP_TOKEN")
if not MCP_TOKEN:
    print("❌ ERROR: MCP_TOKEN not found in environment variables.")
    raise RuntimeError("MCP_TOKEN is missing from the .env file!")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("⚠️ WARNING: GROQ_API_KEY not found. AI Skill verification will be unavailable.")
groq_client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# --- 2. Security Utilities ---
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_blockchain_hash(data_string: str) -> str:
    return hashlib.sha256(data_string.encode()).hexdigest()

def get_academic_standing(score: float):
    if score >= 90:
        return {"description": "Excellent", "color": "#10b981", "grade": "O+"}
    elif score >= 80:
        return {"description": "Very Good", "color": "#22c55e", "grade": "A"}
    elif score >= 70:
        return {"description": "Good", "color": "#eab308", "grade": "B"}
    elif score >= 60:
        return {"description": "Satisfactory", "color": "#f97316", "grade": "C"}
    elif score >= 50:
        return {"description": "Acceptable", "color": "#facc15", "grade": "D"}
    else:
        return {"description": "Poor", "color": "#ef4444", "grade": "F"}

# --- JWT Token Utilities ---
def create_jwt_token(user_id: str, role: str, name: str, company_name: str = None) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "name": name,
        "company_name": company_name,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("cets_token")
    if not token:
        # Fallback to Authorization header if testing via Postman/Swagger
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    payload = decode_jwt_token(token)
    return {
        "employee_id": payload.get("sub"), # Compatibility with incognito check
        "employer_id": payload.get("sub"),
        "role": payload.get("role"),
        "name": payload.get("name"),
    }

def validate_password_policy(password: str) -> bool:
    """Validates that password meets minimum 8 chars, 1 upper, 1 lower, 1 number, 1 special char."""
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    if not re.search(r'[^A-Za-z0-9]', password):
        return False
    return True

# --- 3. Database & Collection Initialization ---
print("🔄 Initializing CETS Database Connection...")
try:
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client["cets_database"]
    
    collection = db["professionals"] 
    users_collection = db["users"]
    threat_logs_collection = db["threat_logs"]
    job_postings_collection = db["job_postings"]
    pending_requests_collection = db["pending_requests"]
    notifications_collection = db["notifications"]
    counters_collection = db["counters"]
    active_sessions_collection = db["active_sessions"]
    chat_messages_collection = db["chat_messages"]
    print("✅ Database Collections Linked Successfully")
except Exception as e:
    print(f"❌ Database Connection Failed: {e}")

# --- 4. Load the Cognitive Firewall AI Module ---
firewall_model = None
scaler = None
features = None

try:
    print("🧠 Loading Adaptive AI Firewall Brain...")
    firewall_model = joblib.load("cognitive_firewall.joblib")
    scaler = joblib.load("firewall_scaler.joblib")
    features = joblib.load("firewall_features.joblib")
    print("✅ Cognitive Firewall Online and Shielding Network")
except Exception as e:
    print(f"⚠️ AI Module Offline: Ensure .joblib files are in root. Error: {e}")

# --- 5. FastAPI App Initialization ---
app = FastAPI(
    title="CETS Full-Stack Ecosystem",
    description="Blockchain-Verified Career Tracking & AI-Secured HR Management System",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket Connection Manager for Live Threat Feed ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

ws_manager = ConnectionManager()


# --- P2P Enterprise Chat Manager ---
class ChatConnectionManager:
    def __init__(self):
        # Maps user_id -> WebSocket connection
        self.active_connections = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception:
                self.disconnect(user_id)

chat_manager = ChatConnectionManager()

@app.on_event("startup")
async def setup_indexes():
    """Automatically builds the TTL index so old notifications delete themselves after 30 days."""
    try:
        await notifications_collection.create_index("created_at", expireAfterSeconds=2592000)
        
        # Initialize counters if they don't exist
        for counter_id, start_val in [("employer_id", 2000), ("employee_id", 54935)]:
            existing = await counters_collection.find_one({"_id": counter_id})
            if not existing:
                await counters_collection.insert_one({"_id": counter_id, "seq": start_val})
        
        await init_redis()
        print("✅ MongoDB TTL Index & Counters Verified")
    except Exception as e:
        print(f"⚠️ Index setup warning: {e}")

# --- 6. AI FIREWALL MIDDLEWARE LOGIC ---
async def check_firewall_and_log(latency: float, packet_size: float, login_attempts: int, error_rate: float, country: str, endpoint_attacked: str, request: Request = None, email: str = None, device_fingerprint: str = None, typing_speed: float = None, local_hour: int = None):
    if firewall_model is None:
        print("⚠️ AI Firewall is offline. Allowing request but logging the gap.")
        return True 
        
    try:
        data = {"latency": latency, "packet_size": packet_size, "login_attempts": login_attempts, "error_rate": error_rate, f"country_{country}": 1}
        input_df = pd.DataFrame([data])
        for col in features:
            if col not in input_df.columns:
                input_df[col] = 0
        input_df = input_df[features]
        
        scaled_data = scaler.transform(input_df)
        prediction = firewall_model.predict(scaled_data)
        
        if prediction[0] == -1 or packet_size > 50000 or login_attempts > 10:
            ip_addr = request.client.host if request and request.client else "127.0.0.1"
            threat_id = f"TL-{str(uuid.uuid4())[:6].upper()}"
            
            threat_record = {
                "id": threat_id, "time": datetime.now().strftime("%I:%M:%S %p"),
                "ip": ip_addr, "type": "Volumetric Attack" if packet_size > 50000 else "Intrusion Attempt",
                "status": "Blocked", "severity": "Critical", "endpoint_attacked": endpoint_attacked,
                "timestamp_utc": datetime.now(timezone.utc).isoformat()
            }
            await threat_logs_collection.insert_one(threat_record)
            
            # Broadcast to all connected admin WebSockets
            await ws_manager.broadcast(threat_record)
            
            raise HTTPException(status_code=403, detail="🚨 ACCESS DENIED: Threat detected by CETS Firewall.")
        
        # --- BEHAVIORAL ANALYSIS LAYER ---
        if email:
            behavioral_flags = []
            ip_addr = request.client.host if request and request.client else "127.0.0.1"
            user_profile = await users_collection.find_one({"email": email})
            
            if user_profile:
                behavioral_baseline = user_profile.get("behavioral_baseline", {})
                
                # 1. DEVICE FINGERPRINTING
                if device_fingerprint:
                    known_devices = behavioral_baseline.get("known_devices", [])
                    if known_devices and device_fingerprint not in known_devices:
                        behavioral_flags.append(f"Unknown device fingerprint detected: {device_fingerprint[:12]}...")
                    # Store new device (keep last 5)
                    if device_fingerprint not in known_devices:
                        known_devices.append(device_fingerprint)
                        known_devices = known_devices[-5:]  # Keep last 5 known devices
                        behavioral_baseline["known_devices"] = known_devices
                
                # 2. LATENCY PROFILING
                latency_history = behavioral_baseline.get("latency_history", [])
                if len(latency_history) >= 5:
                    avg_latency = sum(latency_history) / len(latency_history)
                    if latency > avg_latency * 3 and avg_latency > 0:  # 3x spike
                        behavioral_flags.append(f"Latency anomaly: {latency:.0f}ms vs baseline {avg_latency:.0f}ms")
                latency_history.append(latency)
                behavioral_baseline["latency_history"] = latency_history[-20:]  # Rolling window of 20
                
                # 3. TEMPORAL ANOMALY DETECTION
                if local_hour is not None:
                    active_hours = behavioral_baseline.get("active_hours", [])
                    if len(active_hours) >= 10:
                        from collections import Counter
                        hour_counts = Counter(active_hours)
                        common_hours = {h for h, c in hour_counts.items() if c >= 2}
                        if common_hours and local_hour not in common_hours:
                            is_night = local_hour >= 0 and local_hour < 5
                            if is_night:
                                behavioral_flags.append(f"Unusual login time: {local_hour}:00 (nighttime, outside normal pattern)")
                            else:
                                behavioral_flags.append(f"Unusual login hour: {local_hour}:00 (outside established pattern)")
                    active_hours.append(local_hour)
                    behavioral_baseline["active_hours"] = active_hours[-50:]  # Keep last 50
                
                # 4. KEYSTROKE DYNAMICS
                if typing_speed is not None and typing_speed > 150:
                    behavioral_flags.append(f"Non-human typing speed detected: {typing_speed:.0f} chars/sec (bot-like)")
                
                # Save updated baseline
                await users_collection.update_one(
                    {"email": email},
                    {"$set": {"behavioral_baseline": behavioral_baseline}}
                )
                
                # Log behavioral flags as warnings (non-blocking for now)
                if behavioral_flags:
                    threat_id = f"BH-{str(uuid.uuid4())[:6].upper()}"
                    behavioral_record = {
                        "id": threat_id, "time": datetime.now().strftime("%I:%M:%S %p"),
                        "ip": ip_addr, "type": "Behavioral Anomaly",
                        "status": "Flagged", "severity": "Warning",
                        "endpoint_attacked": endpoint_attacked,
                        "flags": behavioral_flags,
                        "user_email": email,
                        "timestamp_utc": datetime.now(timezone.utc).isoformat()
                    }
                    await threat_logs_collection.insert_one(behavioral_record)
                    await ws_manager.broadcast(behavioral_record)
        
        return True
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ AI Firewall encountered an error: {e}. Allowing request cautiously.")
        return True

# --- 7. DATA MODELS (Pydantic) ---
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str
    company_name: Optional[str] = None 

class UserLogin(BaseModel):
    email: str
    password: str
    latency: float = 45.0
    packet_size: float = 3000.0
    login_attempts: int = 1
    error_rate: float = 0.01
    country: str = "India"
    device_fingerprint: Optional[str] = None
    typing_speed: Optional[float] = None
    local_hour: Optional[int] = None

class ProfileUpdateStrict(BaseModel):
    about: str = Field(..., min_length=10, max_length=500, description="Bio must be between 10 and 500 characters.")
    skills: List[str] = Field(..., max_length=20, description="Maximum of 20 skills allowed.")
    languages: List[str] = Field(..., max_length=10, description="Maximum of 10 languages allowed.")
    hobbies: List[str] = Field(..., max_length=5, description="Maximum of 5 hobbies allowed.")

class OTPVerification(BaseModel):
    user_id: str
    contact_value: str 
    otp_code: str

class ExperienceSchema(BaseModel):
    role: str
    firm: str
    start_date: str
    end_date: str
    is_verified: bool

class EducationSchema(BaseModel):
    degree: str
    institution: str
    year: str
    score: float

class JobPost(BaseModel):
    employer_id: str
    company_name: str
    job_title: str
    vacancy: int
    location: str
    lockIn: str
    experience: str
    qualification: str
    salary: str
    lastDate: str

class JobApplication(BaseModel):
    employee_id: str
    employee_name: str
    employer_id: str
    company_name: str
    job_title: str
    type: str = "application"  # Defines if it's an application or an onboarding request

class QuizRequest(BaseModel):
    skill: str

class QuizAnswerSubmission(BaseModel):
    skill: str
    answers: dict # format: { "q1": "A", "q2": "C", "q3": "B" }
    correct_answers: dict # format: { "q1": "A", "q2": "C", "q3": "B" } (passed back for stateless validation)

class RelieveRequest(BaseModel):
    employee_id: str
    employee_name: str
    company_name: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str

class NameDobUpdateRequest(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None

class EducationUpdateRequest(BaseModel):
    education: List[dict]

class AboutUpdateRequest(BaseModel):
    about_text: str = Field(..., max_length=500)

# --- 8. OPTIMIZED SEQUENTIAL ID GENERATOR (O(1) via Counter Collection) ---
async def generate_next_id(role: str):
    prefix = "COMP_" if role == "employer" else "EMP_"
    counter_id = "employer_id" if role == "employer" else "employee_id"
    
    result = await counters_collection.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        return_document=True
    )
    
    return f"{prefix}{result['seq']}"

# --- 9. AUTHENTICATION ENDPOINTS ---
@app.post("/api/auth/register", tags=["Auth"])
async def register_user(user: UserRegister):
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    if not validate_password_policy(user.password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.")
    
    hashed_pw = get_password_hash(user.password)
    role = user.role.lower()
    new_id = await generate_next_id(role)
    
    user_doc = {
        "name": user.name, "email": user.email, "password": hashed_pw,
        "role": role, "about": "", 
        "email_verified": False, "phone_verified": False,
        "name_dob_locked": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if role == "employee":
        user_doc["employee_id"] = new_id
        await collection.insert_one({
            "employee_id": new_id, "name": user.name, "email": user.email,
            "about": "", "experience": [], "education": [], "skills": [], "languages": [], "hobbies": []
        })
    elif role == "employer":
        user_doc["employer_id"] = new_id
        user_doc["company_name"] = user.company_name

    await users_collection.insert_one(user_doc)
    return {"status": "Success", "id": new_id}

@app.post("/api/auth/login", tags=["Auth"])
async def login_user(request: Request, response: Response, creds: UserLogin):
    await check_firewall_and_log(creds.latency, creds.packet_size, creds.login_attempts, creds.error_rate, creds.country, "/api/auth/login", request, email=creds.email, device_fingerprint=creds.device_fingerprint, typing_speed=creds.typing_speed, local_hour=creds.local_hour)
    
    if creds.email == "admin@cets.com" and creds.password == "admin123":
        token = create_jwt_token("SYS_ADMIN_01", "admin", "System Admin")
        response.set_cookie(
            key="cets_token", value=token,
            httponly=True, samesite="lax", max_age=JWT_EXPIRATION_HOURS * 3600
        )
        return {"id": "SYS_ADMIN_01", "name": "System Admin", "role": "admin", "token": token}

    user = await users_collection.find_one({"email": creds.email})
    
    # --- Brute-Force Lockout Check ---
    if user:
        failed_attempts = user.get("failed_login_attempts", 0)
        locked_until = user.get("locked_until")
        
        if locked_until:
            lock_time = datetime.fromisoformat(locked_until)
            if datetime.now(timezone.utc) < lock_time:
                remaining = int((lock_time - datetime.now(timezone.utc)).total_seconds() // 60) + 1
                raise HTTPException(status_code=423, detail=f"Account temporarily locked due to {LOGIN_MAX_ATTEMPTS} failed attempts. Try again in {remaining} minute(s).")
            else:
                # Lockout expired, reset
                await users_collection.update_one({"email": creds.email}, {"$set": {"failed_login_attempts": 0, "locked_until": None}})
                failed_attempts = 0
    
    if not user or not verify_password(creds.password, user["password"]):
        # Increment failed attempts if user exists
        if user:
            new_attempts = user.get("failed_login_attempts", 0) + 1
            update_fields = {"failed_login_attempts": new_attempts}
            if new_attempts >= LOGIN_MAX_ATTEMPTS:
                update_fields["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)).isoformat()
                await users_collection.update_one({"email": creds.email}, {"$set": update_fields})
                raise HTTPException(status_code=423, detail=f"Account locked for {LOGIN_LOCKOUT_MINUTES} minutes after {LOGIN_MAX_ATTEMPTS} failed attempts.")
            await users_collection.update_one({"email": creds.email}, {"$set": update_fields})
            raise HTTPException(status_code=401, detail=f"Invalid Credentials. {LOGIN_MAX_ATTEMPTS - new_attempts} attempt(s) remaining.")
        raise HTTPException(status_code=401, detail="Invalid Credentials provided.")
    
    # --- Successful Login: Reset failed attempts ---
    user_id = user.get("employee_id") or user.get("employer_id")
    ip_addr = request.client.host if request.client else "127.0.0.1"
    
    await users_collection.update_one(
        {"email": creds.email},
        {"$set": {
            "last_login": datetime.now(timezone.utc).isoformat(),
            "last_login_ip": ip_addr,
            "failed_login_attempts": 0,
            "locked_until": None
        }}
    )
    
    # Track active session for admin traffic monitoring
    await active_sessions_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "name": user["name"],
            "role": user["role"],
            "ip": ip_addr,
            "logged_in_at": datetime.now(timezone.utc).isoformat(),
            "last_activity": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    token = create_jwt_token(user_id, user["role"], user["name"], user.get("company_name"))
    response.set_cookie(
        key="cets_token", value=token,
        httponly=True, samesite="lax", max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    return {
        "role": user["role"], "name": user["name"], "id": user_id,
        "company_name": user.get("company_name"), "about": user.get("about", ""),
        "email_verified": user.get("email_verified", False), "phone_verified": user.get("phone_verified", False),
        "last_login": user.get("last_login"),
        "last_login_ip": user.get("last_login_ip", "N/A"),
        "name_dob_locked": user.get("name_dob_locked", False),
        "token": token
    }

# --- 10. PROFILE & ANALYTICS ---

# Helper: Deduplicate a list case-insensitively, preserving original casing
def deduplicate_list(items: list, max_length: int) -> list:
    seen = set()
    unique = []
    for item in items:
        key = item.strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(item.strip())
    return unique[:max_length]

@app.get("/api/professional/{employee_id}", tags=["Profile"])
async def get_profile(employee_id: str):
    profile = await collection.find_one({"employee_id": employee_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    # Auto-cleanup legacy profiles with excess/duplicate entries
    needs_update = False
    cleaned = {}
    for field, limit in [("skills", 20), ("languages", 10), ("hobbies", 5)]:
        original = profile.get(field, [])
        deduped = deduplicate_list(original, limit)
        if deduped != original:
            cleaned[field] = deduped
            profile[field] = deduped
            needs_update = True
    
    if needs_update:
        await collection.update_one({"employee_id": employee_id}, {"$set": cleaned})
    
    standing = get_academic_standing(profile.get("average_academic_score", 0))
    profile["academic_standing"] = standing
    return profile

@app.put("/api/profile/customize/{user_id}", tags=["Profile"])
async def customize_premium_profile(user_id: str, data: ProfileUpdateStrict):
    # Server-side deduplication & limit enforcement
    update_payload = {
        "about": data.about,
        "skills": deduplicate_list(data.skills, 20),
        "languages": deduplicate_list(data.languages, 10),
        "hobbies": deduplicate_list(data.hobbies, 5)
    }
    
    result = await collection.update_one({"employee_id": user_id}, {"$set": update_payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    return {"message": "Profile customized successfully.", "data": update_payload}

# --- Name/DOB Soft Lock Endpoint ---
@app.put("/api/profile/update_basic/{user_id}", tags=["Profile"])
async def update_basic_details(user_id: str, data: NameDobUpdateRequest):
    user = await users_collection.find_one({"$or": [{"employee_id": user_id}, {"employer_id": user_id}]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.get("name_dob_locked", False):
        raise HTTPException(status_code=403, detail="Name and DOB have already been updated once. Please contact admin for corrections.")
    
    update_fields = {}
    prof_update_fields = {}
    
    if data.name:
        update_fields["name"] = data.name
        prof_update_fields["name"] = data.name
    if data.dob:
        update_fields["dob"] = data.dob
        prof_update_fields["dob"] = data.dob
    if data.gender:
        update_fields["gender"] = data.gender
        prof_update_fields["gender"] = data.gender
    
    if update_fields:
        update_fields["name_dob_locked"] = True
        id_field = "employee_id" if user.get("role") == "employee" else "employer_id"
        await users_collection.update_one({id_field: user_id}, {"$set": update_fields})
        
        if prof_update_fields and user.get("role") == "employee":
            await collection.update_one({"employee_id": user_id}, {"$set": prof_update_fields})
    
    return {"message": "Basic details updated and locked.", "name_dob_locked": True}

# --- Incognito Mode Toggle ---
@app.put("/api/profile/incognito/{user_id}", tags=["Profile"])
async def toggle_incognito_mode(user_id: str, request: Request, user: dict = Depends(get_current_user)):
    if user.get("employee_id") != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to change this profile's privacy settings.")
        
    profile = await collection.find_one({"employee_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    new_status = not profile.get("incognito_mode", False)
    await collection.update_one({"employee_id": user_id}, {"$set": {"incognito_mode": new_status}})
    
    return {"message": f"Incognito Mode is now {'ON' if new_status else 'OFF'}.", "incognito_mode": new_status}

# --- Education Update Endpoint (Syncs to MongoDB) ---
@app.put("/api/profile/education/{user_id}", tags=["Profile"])
async def update_education(user_id: str, data: EducationUpdateRequest):
    # Recalculate average score
    scores = [edu.get("score", 0) for edu in data.education if edu.get("score")]
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0
    
    result = await collection.update_one(
        {"employee_id": user_id},
        {"$set": {"education": data.education, "average_academic_score": avg_score}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    return {"message": "Education details updated.", "average_academic_score": avg_score}

# --- About Us / Profile Save for Employer ---
@app.post("/api/profile/about/{user_id}", tags=["Profile"])
async def save_about_profile(user_id: str, data: AboutUpdateRequest):
    result = await users_collection.update_one(
        {"$or": [{"employee_id": user_id}, {"employer_id": user_id}]},
        {"$set": {"about": data.about_text}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": "Profile updated successfully."}

@app.post("/api/profile/verify_contact", tags=["Trust & Security"])
async def verify_user_contact(data: OTPVerification):
    if data.otp_code != "123456": # Hardcoded for development
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
    
    field_to_update = "email_verified" if "@" in data.contact_value else "phone_verified"
    await users_collection.update_one(
        {"$or": [{"employee_id": data.user_id}, {"employer_id": data.user_id}]},
        {"$set": {field_to_update: True}}
    )
    
    return {"message": f"{field_to_update.replace('_', ' ').title()} successfully! Badge unlocked."}

@app.get("/api/analytics/employee/{emp_id}", tags=["Analytics"])
async def get_employee_retention_score(emp_id: str):
    profile = await collection.find_one({"employee_id": emp_id})
    if not profile or not profile.get("experience"):
        return {"average_tenure": 0.0, "remarks": "Fresh Profile"}
        
    total_days, job_count = 0, 0
    for exp in profile.get("experience", []):
        try:
            start, end = str(exp.get("start_date")).strip(), str(exp.get("end_date")).strip()
            if start.lower() in ["nan", "", "none"]: continue
            s_date = pd.to_datetime(start, errors='coerce')
            if pd.isna(s_date): continue
            e_date = datetime.now() if end.lower() in ["present", "nan", "", "none"] else pd.to_datetime(end, errors='coerce')
            if pd.isna(e_date): e_date = datetime.now()
            diff = (e_date - s_date).days
            if diff > 0: total_days += diff; job_count += 1
        except: continue
                
    if job_count == 0: return {"average_tenure": 0.0, "remarks": "No Data"}
    avg_yrs = round((total_days / 365.25) / job_count, 1)
    remarks = "Frequent Switcher" if avg_yrs < 1.2 else "Stable Professional" if avg_yrs < 3.0 else "Highly Loyal Talent!"
    return {"average_tenure": avg_yrs, "remarks": remarks}

# --- 10.5 CHANGE PASSWORD (BACKEND VALIDATED) ---
@app.post("/api/auth/change_password/{user_id}", tags=["Auth"])
async def change_password(user_id: str, data: ChangePasswordRequest):
    user = await users_collection.find_one({"$or": [{"employee_id": user_id}, {"employer_id": user_id}]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if not verify_password(data.old_password, user["password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    
    if data.old_password == data.new_password:
        raise HTTPException(status_code=400, detail="You cannot change your password to your current password.")
    
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    
    if not validate_password_policy(data.new_password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.")
    
    new_hash = get_password_hash(data.new_password)
    id_field = "employee_id" if user.get("role") == "employee" else "employer_id"
    await users_collection.update_one({id_field: user_id}, {"$set": {"password": new_hash}})
    
    return {"message": "Password updated securely."}

# --- 11. NOTIFICATIONS ---
@app.get("/api/notifications/{user_id}", tags=["Notifications"])
async def get_user_notifications(user_id: str):
    cursor = notifications_collection.find({"user_id": user_id}, {"_id": 1, "title": 1, "message": 1, "type": 1, "is_read": 1, "created_at": 1}).sort("created_at", -1)
    
    notifications = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        notifications.append(doc)
        
    return {"notifications": notifications}

@app.patch("/api/notifications/read", tags=["Notifications"])
async def mark_notifications_seen(notification_ids: List[str]):
    object_ids = [ObjectId(nid) for nid in notification_ids]
    result = await notifications_collection.update_many(
        {"_id": {"$in": object_ids}},
        {"$set": {"is_read": True}}
    )
    return {"message": f"{result.modified_count} notifications marked as read."}

# --- 11. AI SKILL VERIFICATION (PROOF OF SKILL) ---

@app.post("/api/skills/generate_quiz", tags=["Profile", "AI Verification"])
async def generate_skill_quiz(req: QuizRequest, user: dict = Depends(get_current_user)):
    if not groq_client:
        raise HTTPException(status_code=503, detail="AI Verification service is strictly offline. GROQ API key missing.")
    
    skill = req.skill.strip()
    if not skill:
        raise HTTPException(status_code=400, detail="Skill is required.")
        
    prompt = f"""
    Generate a 3-question multiple-choice technical quiz to assess intermediate knowledge of: {skill}.
    Return strictly a JSON object with this exact structure:
    {{
      "questions": [
        {{
          "id": "q1",
          "text": "Question text here?",
          "options": {{"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}},
          "correct_option": "A"
        }},
        ... (q2 and q3)
      ]
    }}
    Do not return any markdown tags, fences, or other text. Just the raw JSON object.
    """
    
    try:
        completion = await groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=600
        )
        
        raw_response = completion.choices[0].message.content.strip()
        # Clean up in case the LLM wrapped it in markdown
        if raw_response.startswith("```json"):
            raw_response = raw_response[7:]
        if raw_response.endswith("```"):
            raw_response = raw_response[:-3]
            
        quiz_data = json.loads(raw_response.strip())
        
        # We send questions to the frontend WITHOUT the correct answers
        # But we must keep track of them for validation. For stateless design,
        # we encrypt or sign the answers and send them to the frontend to pass back,
        # or we just trust the frontend for this demo (sending them back as a separate encrypted payload).
        # For this implementation, we will pass them back separately and expect the client to return them.
        
        client_questions = []
        correct_map = {}
        for q in quiz_data["questions"]:
            client_questions.append({
                "id": q["id"],
                "text": q["text"],
                "options": q["options"]
            })
            correct_map[q["id"]] = q["correct_option"]
            
        return {
            "skill": skill,
            "questions": client_questions,
            "validation_key": correct_map # In prod, this should be signed/encrypted via JWT to prevent cheating.
        }
        
    except Exception as e:
        print(f"Quiz Generation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI Quiz. Please try again.")

@app.post("/api/skills/verify_quiz", tags=["Profile", "AI Verification"])
async def verify_skill_quiz(payload: QuizAnswerSubmission, user: dict = Depends(get_current_user)):
    user_id = user.get("employee_id")
    if not user_id:
        raise HTTPException(status_code=403, detail="Only employees can verify skills.")
        
    score = 0
    total = len(payload.correct_answers)
    
    if total != 3:
        raise HTTPException(status_code=400, detail="Invalid quiz format.")
        
    for q_id, correct_ans in payload.correct_answers.items():
        if payload.answers.get(q_id) == correct_ans:
            score += 1
            
    passed = score == total # Require 100% to get the verified badge
    
    if passed:
        # Update the user profile to append the AI Verified badge to this specific skill
        profile = await collection.find_one({"employee_id": user_id})
        if profile:
            skills = profile.get("skills", [])
            verified_skills = profile.get("verified_skills", [])
            
            # Add to verified skills list if not already there
            if payload.skill not in verified_skills:
                verified_skills.append(payload.skill)
                await collection.update_one(
                    {"employee_id": user_id},
                    {"$set": {"verified_skills": verified_skills}}
                )
                
        return {"passed": True, "score": score, "total": total, "message": f"Congratulations! You scored {score}/{total}. 💡 AI Verified badge awarded for {payload.skill}!"}
    
    return {"passed": False, "score": score, "total": total, "message": f"You scored {score}/{total}. A perfect score is required for AI Verification. Keep learning and try again later!"}

# --- 12. HR ECOSYSTEM & SMART HIRING ---
@app.get("/api/hr/employers_list", tags=["HR"])
async def get_registered_employers():
    if redis_client:
        cached = await redis_client.get("cache:employers_list")
        if cached: return json.loads(cached)
        
    cursor = users_collection.find({"role": "employer"}, {"_id": 0, "company_name": 1})
    employers = await cursor.to_list(length=5000)
    company_names = sorted(list(set([emp.get("company_name") for emp in employers if emp.get("company_name")])))
    
    response_data = {"employers": company_names}
    if redis_client:
        await redis_client.setex("cache:employers_list", 3600, json.dumps(response_data)) # Cache for 1 hour
        
    return response_data

@app.post("/api/hr/request_relieve", tags=["HR"])
async def submit_relieve_request(req: RelieveRequest):
    employer = await users_collection.find_one({"company_name": {"$regex": f"^{re.escape(req.company_name)}$", "$options": "i"}, "role": "employer"})
    employer_id = employer["employer_id"] if employer else f"COMP_{req.company_name}"
    doc = {
        "request_id": f"REL_{int(datetime.now().timestamp())}", "type": "relieve",
        "employee_id": req.employee_id, "employee_name": req.employee_name,
        "employer_id": employer_id, "company_name": req.company_name,
        "status": "pending", "applied_at": datetime.now(timezone.utc).isoformat()
    }
    await pending_requests_collection.insert_one(doc)
    
    # Notify Employer
    await notifications_collection.insert_one({
        "user_id": employer_id, "title": "New Relieve Request", 
        "message": f"{req.employee_name} has requested to be relieved.", 
        "type": "Relieve Request", "is_read": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Relieve request submitted successfully."}

@app.get("/api/hr/action_relieve/{request_id}", tags=["Blockchain"])
async def action_relieve_request(request_id: str = Path(...), action: str = Query(...)):
    req = await pending_requests_collection.find_one({"request_id": request_id})
    if not req: raise HTTPException(status_code=404, detail="Relieve request not found.")
    
    if action.lower() == "reject":
        await pending_requests_collection.update_one({"request_id": request_id}, {"$set": {"status": "rejected"}})
        return {"message": "Relieve request rejected."}
        
    elif action.lower() == "accept":
        await pending_requests_collection.update_one({"request_id": request_id}, {"$set": {"status": "accepted"}})
        today_str = datetime.now().strftime("%Y-%m-%d")
        live_hash = generate_blockchain_hash(f"{req['employee_id']}|{req['company_name']}|Relieved|{today_str}")
        
        await collection.update_one(
            {"employee_id": req['employee_id'], "experience.firm": req['company_name'], "experience.end_date": "Present"},
            {"$set": {"experience.$.end_date": today_str, "experience.$.blockchain_hash": live_hash}}
        )
        
        # Bridge Logic: Auto-accept any pending onboarding offer for this employee
        pending_offer = await pending_requests_collection.find_one({
            "employee_id": req['employee_id'],
            "type": "onboarding",
            "status": "pending_employee_acceptance"
        })
        
        if pending_offer:
            await pending_requests_collection.update_one(
                {"request_id": pending_offer["request_id"]},
                {"$set": {"status": "accepted", "onboarded_at": datetime.now(timezone.utc).isoformat()}}
            )
            onboard_hash = generate_blockchain_hash(f"{req['employee_id']}|{pending_offer['company_name']}|{datetime.now().isoformat()}")
            new_experience = {
                "firm": pending_offer['company_name'], "role": pending_offer['job_title'],
                "start_date": today_str, "end_date": "Present",
                "is_verified": True, "blockchain_hash": onboard_hash
            }
            await collection.update_one({"employee_id": req['employee_id']}, {"$push": {"experience": new_experience}})
            
            # Notify Employee about new job
            await notifications_collection.insert_one({
                "user_id": req['employee_id'], "title": "Onboarding Confirmed",
                "message": f"Welcome! {pending_offer['company_name']} has officially onboarded you.",
                "type": "System", "is_read": False, "created_at": datetime.now(timezone.utc).isoformat()
            })
            await invalidate_cache("cache:noticeboard*")
            await invalidate_cache("cache:mcp_jobs*")
            await invalidate_cache("cache:analytics*")
        
        # Notify Employee about relieve
        await notifications_collection.insert_one({
            "user_id": req['employee_id'], "title": "Relieve Approved", 
            "message": f"{req['company_name']} has officially relieved you.", 
            "type": "System", "is_read": False, "created_at": datetime.now(timezone.utc).isoformat()
        })
        await invalidate_cache("cache:noticeboard*")
        await invalidate_cache("cache:mcp_jobs*")
        await invalidate_cache("cache:analytics*")
        
        return {"message": "Employee officially relieved and hashed to ledger.", "hash": live_hash}

@app.post("/api/hr/post_job", tags=["HR"])
async def publish_job_vacancy(job: JobPost, user: dict = Depends(get_current_user)):
    db_job = job.model_dump()
    db_job["employer_id"] = user.get("employer_id")
    db_job["company_name"] = user.get("company_name")
    db_job["status"] = "open"
    db_job["posted_at"] = datetime.now(timezone.utc).isoformat()
    # Split skills comma-separated into list for AI matching
    db_job["required_skills"] = [s.strip() for s in job.qualification.split(",") if s.strip()] 
    
    await job_postings_collection.insert_one(db_job)
    await invalidate_cache("cache:noticeboard*")
    await invalidate_cache("cache:mcp_jobs*")
    await invalidate_cache("cache:analytics*")
    
    return {"message": "Job posted successfully to the noticeboard!"}

@app.get("/api/hr/noticeboard", tags=["HR"])
async def get_noticeboard_jobs():
    if redis_client:
        cached = await redis_client.get("cache:noticeboard")
        if cached: return json.loads(cached)
        
    cursor = job_postings_collection.find({"status": "open"}, {"_id": 0}).sort("posted_at", -1).limit(50)
    jobs = []
    async for doc in cursor:
        jobs.append(doc)
        
    response_data = {"jobs": jobs}
    if redis_client:
        await redis_client.setex("cache:noticeboard", 300, json.dumps(response_data)) # Cache for 5 mins
        
    return response_data

@app.post("/api/hr/apply", tags=["HR"])
async def submit_application(application: JobApplication):
    req_doc = application.model_dump() 
    
    # Bridge Logic: Find actual employer ID if this is an Onboarding Verification
    if req_doc["type"] == "onboarding":
        employer = await users_collection.find_one({"company_name": {"$regex": f"^{re.escape(req_doc['company_name'])}$", "$options": "i"}, "role": "employer"})
        if employer:
            req_doc["employer_id"] = employer["employer_id"]
            
    req_doc["status"] = "pending"
    req_doc["request_id"] = f"REQ_{int(datetime.now().timestamp())}"
    req_doc["applied_at"] = datetime.now(timezone.utc).isoformat()
    await pending_requests_collection.insert_one(req_doc)
    
    # Send Notification to HR
    title = "New Job Application" if req_doc["type"] == "application" else "Onboarding Verification"
    msg = f"{req_doc['employee_name']} applied for {req_doc['job_title']}." if req_doc["type"] == "application" else f"{req_doc['employee_name']} wants to verify onboarding for {req_doc['job_title']}."
    await notifications_collection.insert_one({
        "user_id": req_doc["employer_id"], "title": title, 
        "message": msg, "type": "HR Alert", "is_read": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Request submitted successfully."}

@app.get("/api/hr/my_applications/{employee_id}", tags=["HR"])
async def track_my_requests(employee_id: str):
    cursor = pending_requests_collection.find({"employee_id": employee_id}, {"_id": 0})
    return {"applications": await cursor.to_list(length=100)}

class RevealRequest(BaseModel):
    employer_id: str
    company_name: str
    employee_id: str

@app.post("/api/hr/request_reveal", tags=["HR"])
async def request_identity_reveal(data: RevealRequest):
    existing = await notifications_collection.find_one({
        "user_id": data.employee_id,
        "type": "RevealRequest",
        "title": f"Identity Reveal Request: {data.company_name}"
    })
    if existing:
        return {"message": "You have already sent a request to this candidate."}
        
    await notifications_collection.insert_one({
        "user_id": data.employee_id,
        "title": f"Identity Reveal Request: {data.company_name}",
        "message": f"HR from {data.company_name} is highly interested in your skill profile and invites you to turn off Incognito mode computationally, or reach out to them.",
        "type": "RevealRequest",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Identity reveal request secured and sent anonymously."}

@app.get("/api/hr/pending_requests/{employer_id}", tags=["HR"])
async def get_employer_requests(employer_id: str):
    cursor = pending_requests_collection.find({"employer_id": employer_id, "status": "pending"}, {"_id": 0})
    return {"requests": await cursor.to_list(length=100)}

@app.get("/api/hr/active_employees/{company_name}", tags=["HR"])
async def get_active_employees(company_name: str):
    cursor = collection.find(
        {"experience": {"$elemMatch": {"firm": {"$regex": f"^{company_name}$", "$options": "i"}, "end_date": "Present"}}},
        {"_id": 0, "employee_id": 1, "name": 1, "email": 1, "experience": 1, "gender": 1}
    ).limit(100)
    return {"employees": await cursor.to_list(length=100)}

@app.get("/api/hr/action_request/{request_id}", tags=["Blockchain"])
async def action_onboarding_request(request_id: str = Path(...), action: str = Query(...)):
    request = await pending_requests_collection.find_one({"request_id": request_id})
    if not request: raise HTTPException(status_code=404, detail="Transaction request not found.")
    
    if action.lower() == "reject":
        await pending_requests_collection.update_one({"request_id": request_id}, {"$set": {"status": "rejected"}})
        return {"message": "Candidate rejected."}
        
    elif action.lower() == "accept":
        await pending_requests_collection.update_one(
            {"request_id": request_id}, {"$set": {"status": "accepted", "onboarded_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        # Bridge Logic: Auto-close overlapping active job if they haven't explicitly relieved yet
        await collection.update_many(
            {"employee_id": request['employee_id'], "experience.end_date": "Present"},
            {"$set": {"experience.$[elem].end_date": today_str}},
            array_filters=[{"elem.end_date": "Present"}]
        )
        
        live_hash = generate_blockchain_hash(f"{request['employee_id']}|{request['company_name']}|{datetime.now().isoformat()}")
        new_experience = {
            "firm": request['company_name'], "role": request['job_title'],
            "start_date": today_str, "end_date": "Present",
            "is_verified": True, "blockchain_hash": live_hash
        }
        await collection.update_one({"employee_id": request['employee_id']}, {"$push": {"experience": new_experience}})
        
        # Notify Employee
        await notifications_collection.insert_one({
            "user_id": request['employee_id'], "title": "Onboarding Approved", 
            "message": f"Welcome! {request['company_name']} has officially onboarded you.", 
            "type": "System", "is_read": False, "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"message": "Candidate successfully onboarded and hashed.", "hash": live_hash}
        
    raise HTTPException(status_code=400, detail="Invalid Action Parameter.")

# --- 13. ADMIN & SEARCH ---
@app.get("/api/admin/threat_logs", tags=["Admin"])
async def fetch_realtime_threats():
    logs_cursor = threat_logs_collection.find({}, {"_id": 0}).sort("timestamp_utc", -1).limit(25)
    return await logs_cursor.to_list(length=25)

@app.get("/api/admin/active_sessions", tags=["Admin"])
async def get_active_sessions():
    """Returns all users who have logged in within the last 24 hours (active traffic)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    cursor = active_sessions_collection.find(
        {"logged_in_at": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("logged_in_at", -1)
    sessions = await cursor.to_list(length=500)
    
    total_employees = sum(1 for s in sessions if s.get("role") == "employee")
    total_employers = sum(1 for s in sessions if s.get("role") == "employer")
    
    return {
        "total": len(sessions),
        "employees": total_employees,
        "employers": total_employers,
        "sessions": sessions
    }

@app.get("/api/admin/attack_ledger", tags=["Admin"])
async def get_attack_ledger(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200)):
    """Full historical attack ledger with pagination. The cognitive firewall learns from these patterns."""
    total = await threat_logs_collection.count_documents({})
    cursor = threat_logs_collection.find({}, {"_id": 0}).sort("timestamp_utc", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    # Compute summary analytics
    volumetric = sum(1 for l in logs if l.get("type") == "Volumetric Attack")
    intrusion = sum(1 for l in logs if l.get("type") == "Intrusion Attempt")
    unique_ips = len(set(l.get("ip", "") for l in logs))
    
    return {
        "total_records": total,
        "showing": len(logs),
        "skip": skip,
        "summary": {
            "volumetric_attacks": volumetric,
            "intrusion_attempts": intrusion,
            "unique_hostile_ips": unique_ips
        },
        "logs": logs
    }

@app.get("/api/admin/traffic_stats", tags=["Admin"])
async def get_traffic_stats():
    """Returns hourly login counts for the last 24 hours for the traffic graph."""
    now = datetime.now(timezone.utc)
    hourly_data = []
    
    for i in range(24):
        hour_start = (now - timedelta(hours=23-i)).replace(minute=0, second=0, microsecond=0)
        hour_end = hour_start + timedelta(hours=1)
        
        count = await active_sessions_collection.count_documents({
            "logged_in_at": {
                "$gte": hour_start.isoformat(),
                "$lt": hour_end.isoformat()
            }
        })
        
        hourly_data.append({
            "hour": hour_start.strftime("%H:%M"),
            "count": count
        })
    
    return {"hourly_traffic": hourly_data}

@app.get("/api/secure_search/{emp_id}", tags=["Search"])
async def perform_secure_ledger_lookup(emp_id: str, request: Request):
    await check_firewall_and_log(45, 3000, 1, 0.01, "India", f"/api/secure_search/{emp_id}", request)
    profile = await collection.find_one({"employee_id": emp_id}, {"_id": 0})
    if not profile: raise HTTPException(status_code=404, detail="Profile not found in CETS ecosystem.")
    
    standing = get_academic_standing(profile.get("average_academic_score", 0))
    profile["academic_standing"] = standing
    
    # Privacy Check: Are we the owner?
    is_owner = False
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("sub") == emp_id:
                is_owner = True
        except Exception:
            pass
            
    if profile.get("incognito_mode", False) and not is_owner:
        profile["name"] = "Anonymous Candidate"
        profile["email"] = "Hidden by Incognito"
        profile["personal_info"] = None
        if "experience" in profile and profile["experience"]:
            for exp in profile["experience"]:
                exp["firm"] = "Confidential Employer"
                
    return profile

# --- 14. WEBSOCKET FOR LIVE THREAT FEED ---
@app.websocket("/ws/threat_feed")
async def websocket_threat_feed(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive by waiting for messages (or just pings)
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# ================================================================
# --- 15. OPENCLAW INTEGRATION (Autonomous AI Agent Endpoints) ---
# ================================================================
# These endpoints are designed for an autonomous agent (OpenClaw)
# to interact with the CETS backend via messaging apps like
# Telegram or WhatsApp. Secured via API key header.

OPENCLAW_API_KEY = os.getenv("OPENCLAW_API_KEY")
MCP_TOKEN = os.getenv("MCP_TOKEN")

async def verify_openclaw_key(request: Request):
    key = request.headers.get("X-OpenClaw-Key")
    if key != OPENCLAW_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid OpenClaw API Key.")

# --- HR Secretary: Read pending onboarding/application requests ---
@app.get("/api/openclaw/pending_requests/{employer_id}", tags=["OpenClaw"])
async def openclaw_pending_requests(employer_id: str, request: Request):
    await verify_openclaw_key(request)
    user = await users_collection.find_one({"employer_id": employer_id})
    if not user:
        raise HTTPException(status_code=404, detail="Employer not found.")
    
    pending = await pending_requests_collection.find(
        {"employer_id": employer_id, "status": "pending"}, {"_id": 0}
    ).to_list(length=50)
    
    return {
        "employer": user.get("company_name", "Unknown"),
        "pending_count": len(pending),
        "requests": pending,
        "summary": f"You have {len(pending)} pending request(s)." if pending else "No pending requests. All clear!"
    }

# --- HR Secretary: Approve or Reject a request via agent command ---
class OpenClawActionRequest(BaseModel):
    request_id: str
    action: str  # "approve" or "reject"
    employer_id: str

@app.post("/api/openclaw/action_request", tags=["OpenClaw"])
async def openclaw_action_request(data: OpenClawActionRequest, request: Request):
    await verify_openclaw_key(request)
    
    if data.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'.")
    
    pending = await pending_requests_collection.find_one({"request_id": data.request_id, "employer_id": data.employer_id})
    if not pending:
        raise HTTPException(status_code=404, detail="Request not found or does not belong to this employer.")
    
    if pending.get("status") != "pending":
        return {"message": f"Request already processed (status: {pending.get('status')})."}
    
    new_status = "approved" if data.action == "approve" else "rejected"
    await pending_requests_collection.update_one(
        {"request_id": data.request_id},
        {"$set": {"status": new_status, "actioned_at": datetime.now(timezone.utc).isoformat(), "actioned_by": "OpenClaw Agent"}}
    )
    
    # Notify the employee
    await notifications_collection.insert_one({
        "user_id": pending.get("employee_id"), "title": f"Request {new_status.title()}",
        "message": f"Your request to {pending.get('company_name', 'employer')} has been {new_status} by the HR agent.",
        "type": "OpenClaw", "is_read": False, "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"Request {data.request_id} has been {new_status}.", "status": new_status}

# --- Career Agent: Find matching jobs for an employee based on skills (Semantic AI) ---
@app.get("/api/openclaw/job_matches/{employee_id}", tags=["OpenClaw"])
async def openclaw_job_matches(employee_id: str, request: Request):
    await verify_openclaw_key(request)
    
    profile = await collection.find_one({"employee_id": employee_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found.")
    
    user_skills_list = [s.lower().strip() for s in profile.get("skills", [])]
    if not user_skills_list:
        return {"matches": [], "message": "No skills found on profile. Add skills to get job recommendations."}
    
    user_skills_text = " ".join(user_skills_list)
    
    open_jobs = await job_postings_collection.find({"status": "open"}, {"_id": 0}).to_list(length=100)
    if not open_jobs:
        return {"matches": [], "message": "No open jobs available at the moment."}
        
    matched_jobs = []
    
    # Prepare corpus for TF-IDF (User Skills + All Job Skills)
    corpus = [user_skills_text]
    valid_jobs = []
    
    for job in open_jobs:
        job_skills_list = [s.lower().strip() for s in job.get("required_skills", [])]
        if job_skills_list:
            job_skills_text = " ".join(job_skills_list)
            corpus.append(job_skills_text)
            valid_jobs.append({
                "job_title": job.get("job_title", "Untitled"),
                "company": job.get("company_name", "Unknown"),
                "location": job.get("location", "Remote"),
                "posted_at": job.get("posted_at"),
                "required_skills": job.get("required_skills", [])
            })
            
    if not valid_jobs:
        return {"matches": [], "message": "No jobs with defined skills found."}

    # Compute TF-IDF Matrix
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)
    
    # Compute Cosine Similarity between User (index 0) and all Jobs (index 1 to N)
    similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
    
    for i, score in enumerate(similarities):
        match_percentage = round(score * 100)
        # Threshold for semantic match: > 5% similarity
        if match_percentage > 5:
            job_data = valid_jobs[i]
            job_data["match_score"] = match_percentage
            job_data["semantic_match"] = True
            matched_jobs.append(job_data)
    
    matched_jobs.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "employee": profile.get("name", employee_id),
        "total_matches": len(matched_jobs),
        "top_matches": matched_jobs[:10],
        "message": f"Found {len(matched_jobs)} job(s) matching your skills!" if matched_jobs else "No matching jobs found right now. Check back later!"
    }

# --- Career Agent: Poll recent notifications ---
@app.get("/api/openclaw/noticeboard/{user_id}", tags=["OpenClaw"])
async def openclaw_noticeboard(user_id: str, request: Request):
    await verify_openclaw_key(request)
    
    notes = await notifications_collection.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(length=10)
    
    unread = sum(1 for n in notes if not n.get("is_read"))
    return {
        "user_id": user_id,
        "total_notifications": len(notes),
        "unread_count": unread,
        "notifications": notes,
        "summary": f"You have {unread} unread notification(s)." if unread else "All caught up! No unread notifications."
    }

# --- Career Agent: Quick employee profile summary ---
@app.get("/api/openclaw/employee_summary/{employee_id}", tags=["OpenClaw"])
async def openclaw_employee_summary(employee_id: str, request: Request):
    await verify_openclaw_key(request)
    
    profile = await collection.find_one({"employee_id": employee_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found.")
    
    return {
        "name": profile.get("name", "Unknown"),
        "employee_id": employee_id,
        "skills_count": len(profile.get("skills", [])),
        "top_skills": profile.get("skills", [])[:5],
        "experience_count": len(profile.get("experience", [])),
        "education_count": len(profile.get("education", [])),
        "languages": profile.get("languages", []),
        "about": profile.get("about", "")[:100] + "..." if len(profile.get("about", "")) > 100 else profile.get("about", ""),
        "academic_standing": get_academic_standing(profile.get("average_academic_score", 0))
    }

# ================================================================
# --- 16. MODEL CONTEXT PROTOCOL (MCP) SERVER ---
# ================================================================
# MCP endpoints expose read-only capabilities for external LLMs
# and AI assistants to query CETS data in a standardized format.
# Secured via MCP token header.

async def verify_mcp_token(request: Request):
    token = request.headers.get("X-MCP-Token")
    if token != MCP_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid MCP Token.")

# --- MCP: List available tools/capabilities ---
@app.get("/api/mcp/capabilities", tags=["MCP"])
async def mcp_list_capabilities(request: Request):
    await verify_mcp_token(request)
    return {
        "protocol": "Model Context Protocol",
        "version": "1.0",
        "server": "CETS MCP Server",
        "tools": [
            {
                "name": "search_jobs",
                "description": "Search open job postings on CETS. Supports keyword filtering.",
                "endpoint": "/api/mcp/query/jobs",
                "method": "GET",
                "parameters": {"keyword": "string (optional) — filter jobs by title keyword"}
            },
            {
                "name": "platform_analytics",
                "description": "Get aggregate platform statistics: total users, jobs, threat events.",
                "endpoint": "/api/mcp/query/analytics",
                "method": "GET",
                "parameters": {}
            },
            {
                "name": "lookup_profile",
                "description": "Lookup a public employee profile by their Employee ID.",
                "endpoint": "/api/mcp/query/profile/{employee_id}",
                "method": "GET",
                "parameters": {"employee_id": "string — CETS Employee ID (e.g., EMP_12345)"}
            }
        ]
    }

# --- MCP: Search open jobs ---
@app.get("/api/mcp/query/jobs", tags=["MCP"])
async def mcp_query_jobs(request: Request, keyword: str = ""):
    await verify_mcp_token(request)
    
    cache_key = f"cache:mcp_jobs:{keyword.lower()}"
    if redis_client:
        cached = await redis_client.get(cache_key)
        if cached: return json.loads(cached)
    
    query = {"status": "open"}
    if keyword:
        query["job_title"] = {"$regex": keyword, "$options": "i"}
    
    jobs = await job_postings_collection.find(query, {"_id": 0}).sort("posted_at", -1).limit(20).to_list(length=20)
    
    response_data = {
        "tool": "search_jobs",
        "results_count": len(jobs),
        "jobs": [{
            "title": j.get("job_title", "Untitled"),
            "company": j.get("company_name", "Unknown"),
            "location": j.get("location", "Remote"),
            "salary_range": j.get("salary_range", "Not disclosed"),
            "posted_at": j.get("posted_at"),
            "required_skills": j.get("required_skills", [])
        } for j in jobs]
    }
    
    if redis_client:
        await redis_client.setex(cache_key, 600, json.dumps(response_data)) # Cache 10 mins
        
    return response_data

# --- MCP: Platform analytics ---
@app.get("/api/mcp/query/analytics", tags=["MCP"])
async def mcp_query_analytics(request: Request):
    await verify_mcp_token(request)
    
    if redis_client:
        cached = await redis_client.get("cache:analytics")
        if cached: return json.loads(cached)
    
    total_employees = await collection.count_documents({})
    total_employers = await users_collection.count_documents({"role": "employer"})
    total_jobs = await job_postings_collection.count_documents({"status": "open"})
    total_threats = await threat_logs_collection.count_documents({})
    total_pending = await pending_requests_collection.count_documents({"status": "pending"})
    
    response_data = {
        "tool": "platform_analytics",
        "data": {
            "total_verified_professionals": total_employees,
            "total_employers": total_employers,
            "open_job_postings": total_jobs,
            "threat_events_logged": total_threats,
            "pending_onboarding_requests": total_pending,
            "platform_status": "Operational",
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    }
    
    if redis_client:
        await redis_client.setex("cache:analytics", 300, json.dumps(response_data))
        
    return response_data

# --- MCP: Lookup employee profile (public-safe fields only) ---
@app.get("/api/mcp/query/profile/{employee_id}", tags=["MCP"])
async def mcp_query_profile(employee_id: str, request: Request):
    await verify_mcp_token(request)
    
    profile = await collection.find_one({"employee_id": employee_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found in CETS ecosystem.")
    
    # Return only public-safe fields (no PII like phone, DOB, etc.)
    return {
        "tool": "lookup_profile",
        "profile": {
            "employee_id": employee_id,
            "name": profile.get("name", "Unknown"),
            "skills": profile.get("skills", []),
            "languages": profile.get("languages", []),
            "experience_count": len(profile.get("experience", [])),
            "education_count": len(profile.get("education", [])),
            "academic_standing": get_academic_standing(profile.get("average_academic_score", 0)),
            "about": profile.get("about", "")
        }
    }


# ================================================================
# --- 17. ENTERPRISE P2P CHAT ENGINE ---
# ================================================================

# WebSocket endpoint for real-time 1on1 messaging
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: str):
    await chat_manager.connect(websocket, user_id)
    try:
        while True:
            # We expect JSON: { "receiver_id": "EMP_123", "message": "Hello!" }
            data = await websocket.receive_json()
            receiver_id = data.get("receiver_id")
            message_text = data.get("message")
            
            if receiver_id and message_text:
                chat_msg = {
                    "sender_id": user_id,
                    "receiver_id": receiver_id,
                    "message": message_text,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "read": False
                }
                
                # 1. Save to MongoDB
                # Ensure you define `chat_collection = db["chat_messages"]` up top where DB is init'd.
                await db["chat_messages"].insert_one(chat_msg.copy()) 
                
                # 2. Transmit to Receiver (if online)
                # Ensure the JSON payload excludes the raw MongoDB `_id` Obj.
                if "_id" in chat_msg: del chat_msg["_id"]
                await chat_manager.send_personal_message(chat_msg, receiver_id)
                
                # 3. Echo back to Sender (for UI confirmation)
                await chat_manager.send_personal_message(chat_msg, user_id)
                
    except WebSocketDisconnect:
        chat_manager.disconnect(user_id)
    except Exception as e:
        chat_manager.disconnect(user_id)
        print(f"Chat WS error: {e}")

# Fetch Chat History between two users
@app.get("/api/chat/history/{user1}/{user2}", tags=["Chat"])
async def get_chat_history(user1: str, user2: str):
    # Find messages where user1 is sender and user2 is receiver, OR vice versa
    cursor = db["chat_messages"].find({
        "$or": [
            {"sender_id": user1, "receiver_id": user2},
            {"sender_id": user2, "receiver_id": user1}
        ]
    }).sort("timestamp", 1) # Chronological order
    
    history = []
    async for msg in cursor:
        msg["_id"] = str(msg["_id"])
        history.append(msg)
        
    return {"messages": history}