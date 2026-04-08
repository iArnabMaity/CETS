from fastapi import FastAPI, HTTPException, Query, Path, Request, Response, Depends, WebSocket, WebSocketDisconnect # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from pydantic import BaseModel, Field
from typing import Optional, Any, Union, cast, List, Dict
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import motor.motor_asyncio # type: ignore
import os
from dotenv import load_dotenv # type: ignore
import joblib # type: ignore
import pandas as pd # type: ignore
from datetime import datetime, timezone, timedelta
import hashlib
import bcrypt # type: ignore
import uuid
import re
import jwt # type: ignore
import secrets
import json
import statistics
from bson.objectid import ObjectId # type: ignore
from sklearn.feature_extraction.text import TfidfVectorizer # type: ignore
from sklearn.metrics.pairwise import cosine_similarity # type: ignore
import redis.asyncio as redis # type: ignore
from groq import AsyncGroq # type: ignore

# --- Redis Cache Initialization ---
redis_client: Optional[redis.Redis] = None

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

async def invalidate_cache(pattern: str):
    if redis_client:
        try:
            keys = await redis_client.keys(pattern)
            if keys:
                await redis_client.delete(*keys)
        except Exception as e:
            print(f"⚠️ Cache invalidation failed for pattern '{pattern}': {e}")
# --- 1. Security & Environment Setup ---
load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")
# Use a static fallback for development to avoid logging out users on every uvicorn reload
JWT_SECRET = os.getenv("JWT_SECRET", "cets_super_secret_dev_key_2026_fallback")
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
def create_jwt_token(user_id: str, role: str, name: str, company_name: Optional[str] = None) -> str:
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
        "id": payload.get("sub"), # Fix for admin audit logs looking for 'id'
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
    evaluations_collection = db["evaluations"]
    employer_profiles_collection = db["employer_profiles"]
    update_requests_collection = db["update_requests"]
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Logic
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
    
    yield
    # Shutdown Logic (Optional cleanup)
    if redis_client:
        await redis_client.close()

# --- 5. FastAPI App Initialization ---
app = FastAPI(
    title="CETS Full-Stack Ecosystem",
    description="Blockchain-Verified Career Tracking & AI-Secured HR Management System",
    version="2.0.0",
    lifespan=lifespan
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
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                conn = self.active_connections.get(user_id)
                if conn:
                    await conn.send_json(message)
            except Exception:
                self.disconnect(user_id)

chat_manager = ChatConnectionManager()

# --- 6. AI FIREWALL MIDDLEWARE LOGIC ---

@app.get("/api/auth/handshake", tags=["Auth"])
async def auth_handshake():
    return {"timestamp": datetime.now(timezone.utc).isoformat(), "status": "active"}

async def check_firewall_and_log(
    latency: float, packet_size: float, login_attempts: int, error_rate: float,
    country: str, endpoint_attacked: str, request: Optional[Request] = None,
    email: Optional[str] = None, device_fingerprint: Optional[str] = None,
    typing_speed: Optional[float] = None, local_hour: Optional[int] = None,
    local_minute: Optional[int] = None, mouse_distance: Optional[int] = None,
    mouse_clicks: Optional[int] = None
):
    model = firewall_model
    scl = scaler
    feats = features
    
    if model is None or scl is None or feats is None:
        print("⚠️ AI Firewall is offline. Allowing request but logging the gap.")
        return True 
        
    try:
        # Cast to ensure Pyre knows they are not None here
        model_obj = cast(Any, model)
        scaler_obj = cast(Any, scl)
        features_list = cast(List[str], feats)

        data = {"latency": latency, "packet_size": packet_size, "login_attempts": login_attempts, "error_rate": error_rate, f"country_{country}": 1}
        input_df = pd.DataFrame([data])
        for col in features_list:
            if col not in input_df.columns:
                input_df[col] = 0
        input_df = input_df[features_list]
        
        scaled_data = scaler_obj.transform(input_df)
        prediction = model_obj.predict(scaled_data)
        
        # IP-based DDoS mitigation (very basic)
        client_host = "127.0.0.1"
        if request is not None:
            client = getattr(request, "client", None)
            if client is not None:
                client_host = getattr(client, "host", "127.0.0.1")
        
        ip_addr = client_host
        ip_attempt_key = f"login_attempts:{ip_addr}"
        
        cur_redis = cast(Any, redis_client)
        if cur_redis:
            current_attempts = await cur_redis.incr(ip_attempt_key)
            if current_attempts == 1:
                await cur_redis.expire(ip_attempt_key, 60) # 1 minute window
            
            if current_attempts > 50:
                print(f"🚨 IP {ip_addr} blocked for exceeding rate limits.")
                raise HTTPException(status_code=429, detail="Too many requests. IP blocked.")

        if prediction[0] == -1 or packet_size > 50000 or login_attempts > 10:
            uid_str = str(uuid.uuid4().hex)
            threat_id = f"TL-{str(uid_str)[:6].upper()}" # type: ignore
            
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
            user_profile = await users_collection.find_one({"email": email})
            
            if user_profile:
                behavioral_baseline = user_profile.get("behavioral_baseline", {})
                
                # 1. DEVICE FINGERPRINTING
                if device_fingerprint:
                    known_devices = behavioral_baseline.get("known_devices", [])
                    if known_devices and device_fingerprint not in known_devices:
                        df_slice = str(device_fingerprint)[:12] # type: ignore
                        behavioral_flags.append(f"Unknown device fingerprint detected: {df_slice}...")
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
                    if latency > 400:
                        behavioral_flags.append(f"Absolute latency spike: {latency:.0f}ms (High risk of VPN/Tor usage)")
                latency_history.append(latency)
                behavioral_baseline["latency_history"] = latency_history[-20:]  # Rolling window of 20
                
                # 3. TEMPORAL ANOMALY DETECTION
                if local_hour is not None and local_minute is not None:
                    login_times_minutes = behavioral_baseline.get("login_times_minutes", [])
                    current_time_minutes = local_hour * 60 + local_minute
                    
                    if len(login_times_minutes) >= 5:
                        median_time = float(statistics.median(login_times_minutes))
                        
                        # Calculate absolute difference considering midnight wraparound
                        diff = abs(current_time_minutes - median_time)
                        diff = min(diff, 1440 - diff) 
                        
                        # Flag if login is more than 3 hours (180 mins) from median usual time
                        if diff > 180:
                            median_hour = int(median_time // 60)
                            median_min = int(median_time % 60)
                            behavioral_flags.append(f"Unusual login time: {local_hour:02d}:{local_minute:02d} (Usual: ~{median_hour:02d}:{median_min:02d})")
                    
                    login_times_minutes.append(current_time_minutes)
                    behavioral_baseline["login_times_minutes"] = login_times_minutes[-30:] # Keep last 30
                    
                    is_admin = user_profile.get("role") == "admin"
                    is_night = local_hour >= 1 and local_hour < 5
                    if is_admin and is_night:
                        behavioral_flags.append(f"CRITICAL: Admin login during late night hours ({local_hour}:00)")
                
                # 4. BOT DETECTION (Keystrokes & Mouse)
                if typing_speed is not None and typing_speed > 150:
                    behavioral_flags.append(f"Non-human typing speed detected: {typing_speed:.0f} chars/sec (bot-like)")
                
                if (mouse_distance is not None and mouse_clicks is not None and
                    mouse_distance == 0 and mouse_clicks == 0 and typing_speed is not None):
                    behavioral_flags.append("Zero mouse interaction during active typing session (Scripted login suspected)")
                
                # Save updated baseline
                await users_collection.update_one(
                    {"email": email},
                    {"$set": {"behavioral_baseline": behavioral_baseline}}
                )
                
                # Log behavioral flags as warnings (non-blocking for now)
                if behavioral_flags:
                    uid_str = str(uuid.uuid4().hex)
                    threat_id = f"BH-{str(uid_str)[:6].upper()}" # type: ignore
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
    confirm_password: str
    role: str
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    company_name: Optional[str] = None
    incorporation_year: Optional[str] = None

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
    local_minute: Optional[int] = None
    mouse_distance: Optional[int] = None
    mouse_clicks: Optional[int] = None

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
    id: Optional[str] = None
    degree: str
    institution: str
    year: str
    start_year: Optional[str] = None
    end_year: Optional[str] = None
    score: float

class EducationUpdateRequest(BaseModel):
    education: List[dict] # Generic dict to handle frontend payload

class ExperienceUpdateRequest(BaseModel):
    experience: List[dict]

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

class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class NameDobUpdateRequest(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None

class AboutUpdateRequest(BaseModel):
    about_text: str = Field(..., max_length=500)

class StealthEvaluationSubmission(BaseModel):
    evaluator_id: str
    evaluatee_id: str
    company_name: str
    role: str
    answers: Dict[str, str]
    lockout_months: int = Field(default=3, ge=1, le=12, description="Cooldown period in months (1-12)")
class EvaluationScore(BaseModel):
    evaluatee_id: str
    total_score: float
    category_scores: Dict[str, float]
    evaluated_by: str
    timestamp: str

class ProfileUpdateV2(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    establishment_year: Optional[str] = None

class UpdateApprovalRequest(BaseModel):
    user_id: str
    name: str # Current name or requester name
    requested_changes: Dict[str, Any]
    reason: Optional[str] = "Limit exhausted, need further updates."

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
    # --- Confirm password match ---
    if user.password != user.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    
    # --- Phone uniqueness check ---
    if user.phone:
        existing_phone = await users_collection.find_one({"phone": user.phone})
        if existing_phone:
            raise HTTPException(status_code=400, detail="An account with this phone number already exists.")
    
    if not validate_password_policy(user.password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.")
    
    hashed_pw = get_password_hash(user.password)
    role = user.role.lower()
    new_id = await generate_next_id(role)
    
    user_doc: dict = {
        "name": user.name, "email": user.email, "password": hashed_pw,
        "role": role, "about": "",
        "phone": user.phone or "",
        "email_verified": False, "phone_verified": False,
        "name_dob_locked": False,
        "name_edits_remaining": 3,
        "dob_edits_remaining": 1,
        "company_name_edits_remaining": 1,
        "establishment_year_edits_remaining": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if role == "employee":
        user_doc["employee_id"] = new_id
        user_doc["dob"] = user.dob or ""
        user_doc["gender"] = user.gender or ""
        await collection.insert_one({
            "employee_id": new_id, "name": user.name, "email": user.email,
            "phone": user.phone or "", "dob": user.dob or "", "gender": user.gender or "",
            "about": "", "experience": [], "education": [], "skills": [], "languages": [], "hobbies": [],
            "average_academic_score": 0.0, "academic_standing": "N/A", "average_tenure": 0.0, "behavioral_trust_score": 0.0
        })
    elif role == "employer":
        user_doc["employer_id"] = new_id
        user_doc["company_name"] = user.company_name
        user_doc["incorporation_year"] = user.incorporation_year or ""
        # Initialize Employer Profile for Analytics
        await employer_profiles_collection.insert_one({
            "company_name": user.company_name,
            "email": user.email,
            "employer_id": new_id,
            "phone": user.phone or "",
            "establishment_year": user.incorporation_year or "",
            "active_workforce": 0,
            "avg_retention_rate": 0.0,
            "workforce_trust_index": 0.0
        })

    await users_collection.insert_one(user_doc)
    return {"status": "Success", "id": new_id}

@app.get("/api/auth/check-unique", tags=["Auth"])
async def check_unique_field(field: str, value: str):
    """Real-time uniqueness check for email or phone during registration."""
    if field not in ("email", "phone"):
        raise HTTPException(status_code=400, detail="Only 'email' and 'phone' fields can be checked.")
    existing = await users_collection.find_one({field: value})
    return {"exists": existing is not None}

@app.post("/api/auth/login", tags=["Auth"])
async def login_user(request: Request, response: Response, creds: UserLogin):
    await check_firewall_and_log(
        creds.latency, creds.packet_size, creds.login_attempts, creds.error_rate, creds.country, "/api/auth/login", request, 
        email=creds.email, device_fingerprint=creds.device_fingerprint, typing_speed=creds.typing_speed, 
        local_hour=creds.local_hour, local_minute=creds.local_minute, 
        mouse_distance=creds.mouse_distance, mouse_clicks=creds.mouse_clicks
    )
    
    if creds.email == "admin@cets.com":
        admin_user = await users_collection.find_one({"role": "admin"})
        if admin_user:
            if not verify_password(creds.password, admin_user["password"]):
                raise HTTPException(status_code=401, detail="Invalid Credentials.")
        else:
            if creds.password != "admin123":
                raise HTTPException(status_code=401, detail="Invalid Credentials.")
            
            # create initial admin record
            hashed = get_password_hash("admin123")
            await users_collection.insert_one({
                "email": "admin@cets.com",
                "password": hashed,
                "role": "admin",
                "name": "System Admin",
                "id": "SYS_ADMIN_01",
                "failed_login_attempts": 0,
                "locked_until": None
            })
            
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
                user["failed_login_attempts"] = 0
                user["locked_until"] = None
    
    client_host = getattr(getattr(request, "client", None), "host", "127.0.0.1") if request else "127.0.0.1"
    
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
    user_id = user.get("employer_id") or user.get("employee_id") or user.get("id")
    ip_addr = client_host
    
    await users_collection.update_one(
        {"email": creds.email},
        {"$set": {
            "last_login": datetime.now(timezone.utc).isoformat(),
            "last_login_ip": ip_addr,
            "last_login_device": creds.device_fingerprint or "Unknown Device",
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
        "email": user["email"],
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
    return cast(list, unique[:max_length])

@app.get("/api/profile/me/{user_id}", tags=["Profile"])
async def get_basic_user_info(user_id: str):
    """Fetch basic user info (email, role, name, company, etc.) from users collection."""
    user = await users_collection.find_one({"$or": [{"employee_id": user_id}, {"employer_id": user_id}, {"id": user_id}]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found in registry.")
    
    # Standardize ID for frontend
    user["id"] = user.get("employer_id") or user.get("employee_id") or user.get("id")
    return user

@app.get("/api/professional/{employee_id}", tags=["Profile"])
async def get_profile(employee_id: str):
    profile = await collection.find_one({"employee_id": employee_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    # Auto-cleanup legacy profiles with excess/duplicate entries
    needs_update = False
    cleaned_data: Dict[str, list] = {}
    for field, limit in [("skills", 20), ("languages", 10), ("hobbies", 5)]:
        original = profile.get(field, [])
        deduped = deduplicate_list(original, limit)
        if len(deduped) != len(original): # Check if deduplication actually changed something
            needs_update = True
        cleaned_data[field] = deduped
        profile[field] = deduped # Update profile dict for immediate return
    
    if needs_update:
        await collection.update_one({"employee_id": employee_id}, {"$set": cleaned_data})
    
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
    
    update_fields: dict = {}
    prof_update_fields: dict = {}
    
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
    collection = db["professionals"]
    # This endpoint updates the entire education list
    result = await collection.update_one(
        {"employee_id": user_id},
        {"$set": {"education": data.education}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    await recalculate_employee_metrics(user_id)
    profile = await collection.find_one({"employee_id": user_id})
    return {"message": "Education details updated.", "average_academic_score": profile.get("average_academic_score", 0.0)}

@app.post("/api/profile/education/add/{user_id}", tags=["Profile"])
async def add_education_record(user_id: str, edu: dict):
    collection = db["professionals"]
    if "id" not in edu:
        edu["id"] = f"EDU_{int(datetime.now().timestamp())}_{secrets.token_hex(2)}"
    
    result = await collection.update_one(
        {"employee_id": user_id},
        {"$push": {"education": edu}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    await recalculate_employee_metrics(user_id)
    return {"message": "Education record added.", "id": edu["id"]}

@app.delete("/api/profile/education/delete/{user_id}/{edu_id}", tags=["Profile"])
async def delete_education_record(user_id: str, edu_id: str):
    collection = db["professionals"]
    result = await collection.update_one(
        {"employee_id": user_id},
        {"$pull": {"education": {"id": edu_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    await recalculate_employee_metrics(user_id)
    return {"message": "Education record removed."}

@app.post("/api/profile/experience/add/{user_id}", tags=["Profile"])
async def add_experience_record(user_id: str, exp: dict):
    if "id" not in exp:
        exp["id"] = f"EXP_{int(datetime.now().timestamp())}_{secrets.token_hex(2)}"
    
    result = await collection.update_one(
        {"employee_id": user_id},
        {"$push": {"experience": exp}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    await recalculate_employee_metrics(user_id)
    # If the experience is with a company on our platform, update their metrics too
    firm_name = exp.get("firm")
    if firm_name:
        await recalculate_employer_metrics(firm_name)
        
    return {"message": "Experience record added.", "id": exp["id"]}

@app.delete("/api/profile/experience/delete/{user_id}/{exp_id}", tags=["Profile"])
async def delete_experience_record(user_id: str, exp_id: str):
    # We need to know the firm name before deleting to update metrics if it was "Present"
    profile = await collection.find_one({"employee_id": user_id})
    firm_to_update = None
    if profile:
        for exp in profile.get("experience", []):
            if exp.get("id") == exp_id:
                firm_to_update = exp.get("firm")
                break
                
    result = await collection.update_one(
        {"employee_id": user_id},
        {"$pull": {"experience": {"id": exp_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    await recalculate_employee_metrics(user_id)
    if firm_to_update:
        await recalculate_employer_metrics(firm_to_update)
        
    return {"message": "Experience record removed."}

# --- Enhanced Profile Update V2 (with edit limits) ---
@app.put("/api/profile/update_v2/{user_id}", tags=["Profile"])
async def profile_update_v2(user_id: str, data: ProfileUpdateV2):
    user = await users_collection.find_one({"$or": [{"employee_id": user_id}, {"employer_id": user_id}]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user_updates = {}
    prof_updates = {}
    
    # Validation and Decrementing Limits
    if data.name and data.name != user.get("name"):
        rem = user.get("name_edits_remaining", 3)
        if rem <= 0:
            raise HTTPException(status_code=403, detail="Name edit limit reached. Please submit an update request to admin.")
        user_updates["name"] = data.name
        user_updates["name_edits_remaining"] = rem - 1
        prof_updates["name"] = data.name
        
    if data.dob and data.dob != user.get("dob"):
        rem = user.get("dob_edits_remaining", 1)
        if rem <= 0:
            raise HTTPException(status_code=403, detail="DOB edit limit reached. Please submit an update request to admin.")
        user_updates["dob"] = data.dob
        user_updates["dob_edits_remaining"] = rem - 1
        prof_updates["dob"] = data.dob
        
    if data.company_name and data.company_name != user.get("company_name"):
        rem = user.get("company_name_edits_remaining", 1)
        if rem <= 0:
            raise HTTPException(status_code=403, detail="Company Name edit limit reached. Please submit an update request to admin.")
        user_updates["company_name"] = data.company_name
        user_updates["company_name_edits_remaining"] = rem - 1
        
    if data.establishment_year and data.establishment_year != user.get("establishment_year"):
        rem = user.get("establishment_year_edits_remaining", 1)
        if rem <= 0:
            raise HTTPException(status_code=403, detail="Establishment Year edit limit reached. Please submit an update request to admin.")
        user_updates["establishment_year"] = data.establishment_year
        user_updates["establishment_year_edits_remaining"] = rem - 1

    # Non-limited fields
    if data.gender:
        user_updates["gender"] = data.gender
        prof_updates["gender"] = data.gender
    if data.email:
        # Email changes should require password confirmation and trigger re-verification
        raise HTTPException(
            status_code=400, 
            detail="Email changes require verification. Use the dedicated email change endpoint."
        )
    if data.phone:
        user_updates["phone"] = data.phone # Phone is not limited by default
        prof_updates["phone"] = data.phone
        
    if user_updates:
        id_field = "employee_id" if user.get("role") == "employee" else "employer_id"
        await users_collection.update_one({id_field: user_id}, {"$set": user_updates})
        
    if prof_updates and user.get("role") == "employee":
        await collection.update_one({"employee_id": user_id}, {"$set": prof_updates})
        
    return {"message": "Profile updated successfully.", "updated_fields": list(user_updates.keys())}

# --- Academic Fingerprint Logic ---
@app.get("/api/profile/academic_fingerprint/{user_id}", tags=["Profile", "AI Insight"])
async def get_academic_fingerprint(user_id: str):
    collection = db["professionals"]
    profile = await collection.find_one({"employee_id": user_id})
    if not profile or not profile.get("education"):
        return {"badges": [], "trajectory": [], "message": "No education data available."}
        
    education = sorted(profile.get("education", []), key=lambda x: str(x.get("start_year", x.get("year", ""))))
    if len(education) < 2:
        return {"badges": [{"title": "Emerging Scholar", "description": "Beginning their academic journey.", "color": "#10b981"}], "trajectory": [], "message": "More data needed for full fingerprint."}
        
    # 3x3 Badge Logic (Trajectory, Excellence, Engagement)
    badges = []
    
    # Category 1: Trajectory (Growth, Consistent, Resilient)
    scores = [float(edu.get("score", 0)) for edu in education]
    if scores[-1] > scores[0] + 8:
        badges.append({"title": "Growth Mindset", "description": "Significant upward performance trend.", "color": "#a855f7"})
    elif sum(scores)/len(scores) >= 85:
        badges.append({"title": "Consistent Achiever", "description": "Maintained high-level performance.", "color": "#3b82f6"})
    else:
        badges.append({"title": "Resilient Learner", "description": "Navigated academic fluctuations.", "color": "#f59e0b"})
        
    # Category 2: Excellence (High Honor, Distinguished, Commendable)
    avg_score = sum(scores)/len(scores)
    if avg_score >= 90:
        badges.append({"title": "High Honor", "description": "Exceptional academic excellence (90%+).", "color": "#0ea5e9"})
    elif avg_score >= 80:
        badges.append({"title": "Distinguished Scholar", "description": "Outstanding performance (80%+).", "color": "#10b981"})
    else:
        badges.append({"title": "Commendable Student", "description": "Solid academic foundation (70%+).", "color": "#6366f1"})
        
    # Category 3: Engagement (Persistent, Continuous, Emerging)
    if len(education) >= 3:
        badges.append({"title": "Persistent Scholar", "description": "Long-term dedication to studies.", "color": "#ec4899"})
    elif len(education) >= 2:
        badges.append({"title": "Continuous Learner", "description": "Maintaining active educational goals.", "color": "#06b6d4"})
    else:
        badges.append({"title": "Emerging Scholar", "description": "Beginning a promising academic path.", "color": "#8b5cf6"})
    
    return {
        "badges": badges,
        "message": "AI Academic Fingerprint generated.",
        "trajectory": scores
    }

async def recalculate_employee_metrics(employee_id: str):
    collection = db["professionals"]
    profile = await collection.find_one({"employee_id": employee_id})
    if not profile: return
    
    updates: Dict[str, Any] = {}
    
    # 1. Academic Metrics
    education = profile.get("education", [])
    scores = [float(edu.get("score", 0)) for edu in education if edu.get("score")]
    avg_score = float(f"{sum(scores) / len(scores):.2f}") if scores else 0.0
    updates["average_academic_score"] = avg_score
    updates["academic_standing"] = get_academic_standing(avg_score)
    
    # AI Academic Fingerprint - Always call to get the latest (even if empty/baseline)
    fingerprint = await get_academic_fingerprint(employee_id)
    updates["academic_fingerprint"] = fingerprint
    
    # 2. Experience Metrics
    experience = profile.get("experience", [])
    if experience:
        job_durations = []
        for exp in experience:
            try:
                start, end = str(exp.get("start_date")).strip(), str(exp.get("end_date")).strip()
                if start.lower() in ["nan", "", "none"]: continue
                s_date = pd.to_datetime(start, errors='coerce')
                if pd.isna(s_date): continue
                e_date = datetime.now() if end.lower() in ["present", "nan", "", "none"] else pd.to_datetime(end, errors='coerce')
                if pd.isna(e_date): e_date = datetime.now()
                diff_days = getattr(e_date - s_date, "days", 0)
                if diff_days > 0:
                    job_durations.append(float(diff_days))
            except Exception: continue
        
        job_count = len(job_durations)
        if job_count > 0:
            total_days = sum(job_durations)
            avg_yrs = float(f"{total_days / (365.25 * job_count):.1f}")
            updates["average_tenure"] = avg_yrs

    # 3. Behavioral Trust Score
    cursor = evaluations_collection.find({"evaluatee_id": employee_id})
    evals = await cursor.to_list(length=1000)
    if evals:
        avg_trust = sum((e.get("final_score", 0) for e in evals)) / len(evals)
        updates["behavioral_trust_score"] = float(f"{avg_trust:.1f}")
    else:
        updates["behavioral_trust_score"] = 0.0

    if updates:
        await collection.update_one({"employee_id": employee_id}, {"$set": updates})

async def recalculate_employer_metrics(company_name: str):
    # Use a more lenient regex for the initial find
    safe_name = re.escape(company_name.strip())
    cursor = collection.find(
        {"experience": {"$elemMatch": {
            "firm": {"$regex": f"^\s*{safe_name}\s*$", "$options": "i"}, 
            "end_date": {"$regex": "^present$", "$options": "i"}
        }}}
    )
    active_employees: list = await cursor.to_list(length=2000)
    
    updates = {
        "active_workforce": len(active_employees),
        "avg_retention_rate": 0.0,
        "workforce_trust_index": 0.0
    }
    
    if active_employees:
        company_tenures = []
        now = datetime.now()
        for emp in active_employees:
            # Find the specific experience entry for THIS company that is currently active
            for exp in emp.get("experience", []):
                firm_name_in_exp = str(exp.get("firm", "")).strip().lower()
                target_company_name = company_name.strip().lower()
                
                # Use simple equality for more robustness
                is_firm_match = (firm_name_in_exp == target_company_name)
                is_present = str(exp.get("end_date", "")).strip().lower() == "present"
                
                if is_firm_match and is_present:
                    start_str = str(exp.get("start_date", "")).strip()
                    if start_str:
                        try:
                            s_date = pd.to_datetime(start_str, errors='coerce')
                            if not pd.isna(s_date):
                                if s_date.tzinfo:
                                    s_date = s_date.replace(tzinfo=None)
                                
                                diff_days = (now - s_date).days
                                if diff_days > 0:
                                    company_tenures.append(float(diff_days) / 365.25)
                        except Exception:
                            continue
                    break
                    
        if company_tenures:
            updates["avg_retention_rate"] = float(f"{sum(company_tenures) / len(company_tenures):.1f}")
            
    # Workforce Trust Index (from company evaluations - role: employer)
    cursor_eval = evaluations_collection.find({"company_name": {"$regex": f"^{re.escape(company_name)}$", "$options": "i"}, "role": "employer"})
    evals = await cursor_eval.to_list(length=2000)
    if evals:
        avg_trust = sum((e.get("final_score", 0) for e in evals)) / len(evals)
        updates["workforce_trust_index"] = float(f"{avg_trust:.1f}")

    await employer_profiles_collection.update_one(
        {"company_name": company_name},
        {"$set": updates},
        upsert=True
    )

# --- Stealth Evaluation System ---
@app.post("/api/evaluations/submit", tags=["Stealth Evaluation"])
async def submit_evaluation(data: StealthEvaluationSubmission):
    # Cooldown Check: Ensure the user hasn't evaluated this target recently
    last_eval = await evaluations_collection.find_one(
        {"evaluator_id": data.evaluator_id, "evaluatee_id": data.evaluatee_id},
        sort=[("timestamp", -1)]
    )
    
    if last_eval:
        last_date = datetime.fromisoformat(last_eval["timestamp"])
        if last_date.tzinfo is None:
            last_date = last_date.replace(tzinfo=timezone.utc)
        
        lockout_period = last_eval.get("lockout_months", 6)
        next_available = last_date + timedelta(days=lockout_period * 30)
        
        if datetime.now(timezone.utc) < next_available:
            diff = next_available - datetime.now(timezone.utc)
            months = diff.days // 30
            days = diff.days % 30
            raise HTTPException(status_code=429, detail=f"Feedback locked. Please wait {months} months and {days} days before evaluating again.")

    # Weighted average calculation
    score_map = {"A": 1.0, "B": 0.5, "C": 0.0}
    total_score = 0.0
    category_scores = {}
    for q_id, ans in data.answers.items():
        val = score_map.get(ans, 0.5)
        total_score += val
        category_scores[q_id] = val
        
    # Anomaly Detection (if all 1s or all 0s, flag it but still store)
    is_anomaly = (total_score == len(data.answers)) or (total_score == 0)
    
    final_score = float(f"{(total_score / len(data.answers) * 10):.2f}") if data.answers else 0.0
        
    eval_doc = {
        "evaluator_id": data.evaluator_id,
        "evaluatee_id": data.evaluatee_id,
        "company_name": data.company_name,
        "role": data.role,
        "answers": data.answers,
        "final_score": final_score,
        "category_scores": category_scores,
        "is_anomaly": is_anomaly,
        "lockout_months": data.lockout_months,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await evaluations_collection.insert_one(eval_doc)
    
    # Trigger recalculation for the evaluatee and the company
    await recalculate_employee_metrics(data.evaluatee_id)
    await recalculate_employer_metrics(data.company_name)
    
    return {"message": "Evaluation silently processed.", "score": final_score}

@app.get("/api/evaluations/status/{evaluator_id}/{evaluatee_id}", tags=["Stealth Evaluation"])
async def check_evaluation_status(evaluator_id: str, evaluatee_id: str):
    """Check if evaluation is available and when the next one can be done."""
    last_eval = await evaluations_collection.find_one(
        {"evaluator_id": evaluator_id, "evaluatee_id": evaluatee_id},
        sort=[("timestamp", -1)]
    )
    
    if not last_eval:
        return {"available": True, "next_available": None}
    
    last_date = datetime.fromisoformat(last_eval["timestamp"])
    if last_date.tzinfo is None:
        last_date = last_date.replace(tzinfo=timezone.utc)
        
    lockout_period = last_eval.get("lockout_months", 3)
    next_available = last_date + timedelta(days=lockout_period * 30)
    
    is_available = datetime.now(timezone.utc) >= next_available
    return {
        "available": is_available,
        "next_available": next_available.isoformat(),
        "last_submitted": last_date.isoformat()
    }

@app.get("/api/evaluations/reminders/{company_name}", tags=["Stealth Evaluation"])
async def get_feedback_reminders(company_name: str, evaluator_id: str = Query(...)):
    """Find active employees who are due for feedback (3+ months since last check)."""
    # 1. Get all active employees for this company
    cursor = collection.find(
        {"experience": {"$elemMatch": {"firm": {"$regex": f"^{re.escape(company_name)}$", "$options": "i"}, "end_date": "Present"}}},
        {"_id": 0, "employee_id": 1, "name": 1}
    )
    employees = await cursor.to_list(length=500)
    
    reminders = []
    now = datetime.now(timezone.utc)
    
    for emp in employees:
        emp_id = emp["employee_id"]
        # Find latest eval from this employer for this employee
        last_eval = await evaluations_collection.find_one(
            {"evaluator_id": evaluator_id, "evaluatee_id": emp_id},
            sort=[("timestamp", -1)]
        )
        
        is_due = False
        reason = ""
        
        if not last_eval:
            is_due = True
            reason = "Initial assessment required."
        else:
            last_date = datetime.fromisoformat(last_eval["timestamp"])
            if last_date.tzinfo is None:
                last_date = last_date.replace(tzinfo=timezone.utc)
            
            lockout = last_eval.get("lockout_months", 3)
            next_available = last_date + timedelta(days=lockout * 30)
            
            if now >= next_available:
                is_due = True
                reason = "3-month periodic cycle reached."
        
        if is_due:
            reminders.append({
                "employee_id": emp_id,
                "name": emp["name"],
                "reason": reason,
                "last_eval": last_eval["timestamp"] if last_eval else None
            })
            
    return {"reminders": reminders}

@app.get("/api/evaluations/history/{user_id}", tags=["Stealth Evaluation"])
async def get_evaluation_history(user_id: str):
    cursor = evaluations_collection.find({"evaluatee_id": user_id}, {"_id": 0})
    evals = await cursor.to_list(length=100)
    return {"evaluations": evals}

@app.get("/api/evaluations/company_stats/{company_name}", tags=["Stealth Evaluation"])
async def get_company_stats(company_name: str):
    cursor = evaluations_collection.find({"company_name": {"$regex": f"^{company_name}$", "$options": "i"}, "role": "employer"}, {"_id": 0})
    evals = await cursor.to_list(length=1000)
    if not evals:
        return {"average_score": 0, "total_evaluations": 0, "message": "No data yet."}
        
    avg = sum((e.get("final_score", 0) for e in evals)) / len(evals)
    return {"average_score": float(f"{avg:.2f}"), "total_evaluations": len(evals)}

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
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found.")
    
    # If metrics are missing, calculate them
    if "average_tenure" not in profile:
        await recalculate_employee_metrics(emp_id)
        profile = await collection.find_one({"employee_id": emp_id})
        
    return {
        "average_academic_score": profile.get("average_academic_score", 0.0),
        "average_tenure": profile.get("average_tenure", 0.0),
        "remarks": "Frequent Switcher" if profile.get("average_tenure", 0) < 1.2 else "Stable Professional" if profile.get("average_tenure", 0) < 3.0 else "Highly Loyal Talent!",
        "academic_standing": profile.get("academic_standing", "N/A"),
        "behavioral_trust_score": profile.get("behavioral_trust_score", 0.0),
        "academic_fingerprint": profile.get("academic_fingerprint", {"badges": [], "trajectory": []})
    }

@app.get("/api/hr/company_profile/{company_name}", tags=["HR"])
async def get_company_profile(company_name: str):
    """Fetch public company profile (About, Analytics) by name."""
    # Find the company user to get the 'about' text
    user = await users_collection.find_one({"company_name": {"$regex": f"^{re.escape(company_name)}$", "$options": "i"}, "role": "employer"}, {"_id": 0, "about": 1, "company_name": 1, "establishment_year": 1})
    
    # Get analytics
    analytics = await employer_profiles_collection.find_one({"company_name": {"$regex": f"^{re.escape(company_name)}$", "$options": "i"}}, {"_id": 0})
    
    if not user and not analytics:
        raise HTTPException(status_code=404, detail="Company not found.")
        
    return {
        "company_name": user.get("company_name") if user else company_name,
        "about": user.get("about", "") if user else "",
        "establishment_year": user.get("establishment_year", "") if user else "",
        "analytics": analytics or {"active_workforce": 0, "avg_retention_rate": 0.0, "workforce_trust_index": 0.0}
    }

@app.get("/api/analytics/employer/{company_name}", tags=["Analytics"])
async def get_employer_analytics(company_name: str):
    profile = await employer_profiles_collection.find_one({"company_name": {"$regex": f"^{re.escape(company_name)}$", "$options": "i"}})
    # Self-healing: If profile has workforce but 0 retention, try to recalculate once
    if profile and profile.get("active_workforce", 0) > 0 and profile.get("avg_retention_rate", 0) == 0:
        await recalculate_employer_metrics(company_name)
        profile = await employer_profiles_collection.find_one({"company_name": {"$regex": f"^{re.escape(company_name)}$", "$options": "i"}})

    if not profile:
        await recalculate_employer_metrics(company_name)
        profile = await employer_profiles_collection.find_one({"company_name": {"$regex": f"^{re.escape(company_name)}$", "$options": "i"}})
    
    if not profile:
        return {"active_workforce": 0, "avg_retention_rate": 0.0, "workforce_trust_index": 0.0}
        
    return {
        "active_workforce": profile.get("active_workforce", 0),
        "avg_retention_rate": profile.get("avg_retention_rate", 0.0),
        "workforce_trust_index": profile.get("workforce_trust_index", 0.0)
    }

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
# --- 11.2 UPDATE APPROVAL SYSTEM ---
@app.post("/api/profile/request_update/{user_id}", tags=["Profile"])
async def request_profile_update(user_id: str, data: UpdateApprovalRequest, user: dict = Depends(get_current_user)):
    if user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized to request updates for another user.")
        
    req_hash = uuid.uuid4().hex
    request_id = f"REQ-{''.join(req_hash[i] for i in range(8)).upper()}"
    await update_requests_collection.insert_one({
        "request_id": request_id,
        "user_id": user_id,
        "name": data.name,
        "requested_changes": data.requested_changes,
        "reason": data.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Notify Admin
    await notifications_collection.insert_one({
        "user_id": "SYS_ADMIN_01", # Assuming a system admin ID for notifications
        "title": "New Profile Update Request",
        "message": f"User {data.name} ({user_id}) has submitted a profile update request.",
        "type": "Admin Alert",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Update request submitted to admin.", "request_id": request_id}
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
        
    score: int = 0
    total = len(payload.correct_answers)
    
    if total != 3:
        raise HTTPException(status_code=400, detail="Invalid quiz format.")
        
    for q_id, correct_ans in payload.correct_answers.items():
        if payload.answers.get(q_id) == correct_ans:
            score = score + 1 # type: ignore
            
    passed = (score == total) # Require 100% to get the verified badge
    if passed:
        # Update the user profile to append the AI Verified badge to this specific skill
        profile = await collection.find_one({"employee_id": user_id})
        if profile:
            skills = cast(List[str], profile.get("skills", []))
            verified_skills = cast(List[str], profile.get("verified_skills", []))
            
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
        
        await recalculate_employee_metrics(req['employee_id'])
        await recalculate_employer_metrics(req['company_name'])
        
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
async def get_noticeboard_jobs(page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=100)):
    cache_key = f"cache:noticeboard:{page}:{limit}"
    if redis_client:
        cached = await redis_client.get(cache_key)
        if cached: return json.loads(cached)
        
    total = await job_postings_collection.count_documents({"status": "open"})
    cursor = job_postings_collection.find({"status": "open"}, {"_id": 0}).sort("posted_at", -1).skip((page - 1) * limit).limit(limit)
    jobs = []
    async for doc in cursor:
        jobs.append(doc)
        
    response_data = {"jobs": jobs, "total": total, "page": page, "limit": limit}
    if redis_client:
        await redis_client.setex(cache_key, 300, json.dumps(response_data)) # Cache for 5 mins
        
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
async def get_employer_requests(employer_id: str, page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=100)):
    query = {"employer_id": employer_id, "status": "pending"}
    try:
        total = await pending_requests_collection.count_documents(query)
        cursor = pending_requests_collection.find(query, {"_id": 0}).skip((page - 1) * limit).limit(limit)
        requests = await cursor.to_list(length=limit)
        
        # Enrich each request with basic profile info for Candidate CRM
        enriched_requests = []
        for req in requests:
            emp_id = req.get("employee_id")
            if emp_id:
                prof = await db["professionals"].find_one({"employee_id": emp_id}, {"_id": 0, "about": 1, "experience": 1, "behavioral_trust_score": 1})
                if prof:
                    req["candidate_about"] = prof.get("about", "")
                    req["verified_jobs_count"] = len([exp for exp in prof.get("experience", []) if exp.get("is_verified")])
                    req["behavioral_trust_score"] = prof.get("behavioral_trust_score", 0.0)
            enriched_requests.append(req)

        return {"requests": enriched_requests, "total": total, "page": page, "limit": limit}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/hr/active_employees/{company_name}", tags=["HR"])
async def get_active_employees(company_name: str, page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=100)):
    query = {"experience": {"$elemMatch": {"firm": {"$regex": f"^{company_name}$", "$options": "i"}, "end_date": "Present"}}}
    try:
        total = await collection.count_documents(query)
        cursor = collection.find(
            query,
            {"_id": 0, "employee_id": 1, "name": 1, "email": 1, "experience": 1, "gender": 1}
        ).skip((page - 1) * limit).limit(limit)
        employees = await cursor.to_list(length=limit)
        return {"employees": employees, "total": total, "page": page, "limit": limit}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        
        await recalculate_employee_metrics(request['employee_id'])
        await recalculate_employer_metrics(request['company_name'])
        
        return {"message": "Candidate successfully onboarded and hashed.", "hash": live_hash}
        
    raise HTTPException(status_code=400, detail="Invalid Action Parameter.")

# --- 13. ADMIN & SEARCH ---
@app.delete("/api/admin/delete_user/{user_id}", tags=["Admin"])
async def delete_user(user_id: str, admin: dict = Depends(get_current_user)):
    if admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized. Admin only.")

    # Determine if it's an employee or employer
    is_employee = user_id.startswith("EMP_")
    
    # Fetch user to log details
    user = await users_collection.find_one({"$or": [{"employee_id": user_id}, {"employer_id": user_id}, {"id": user_id}]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    role = user.get("role", "unknown")
    name = user.get("name", "Unknown")

    # 1. DELETE FROM USERS
    await users_collection.delete_one({"$or": [{"employee_id": user_id}, {"employer_id": user_id}, {"id": user_id}]})

    if role == "employee":
        # 2. CASCADING EMPLOYEE DATA
        await collection.delete_one({"employee_id": user_id}) # professionals collection
        await db["evaluations"].delete_many({"evaluatee_id": user_id})
        await db["pending_requests"].delete_many({"employee_id": user_id})
        await db["notifications"].delete_many({"user_id": user_id})
        await db["education"].delete_many({"userId": user_id})
        await db["update_requests"].delete_many({"user_id": user_id}) # New: Delete update requests
    else:
        # 3. CASCADING EMPLOYER DATA
        await db["employer_profiles"].delete_one({"employer_id": user_id})
        await db["job_postings"].delete_many({"employer_id": user_id})
        await db["pending_requests"].delete_many({"employer_id": user_id})
        await db["notifications"].delete_many({"user_id": user_id})
        # Delete evaluations GIVEN by this employer?
        await db["evaluations"].delete_many({"evaluator_id": user_id})
        await db["update_requests"].delete_many({"user_id": user_id}) # New: Delete update requests

    # 4. AUDIT LOGGING
    audit_entry = {
        "event": "ADMIN_USER_DELETION",
        "admin_id": admin["id"],
        "admin_name": admin["name"],
        "admin_action": True,
        "target_user_id": user_id,
        "target_name": name,
        "role": role,
        "timestamp": datetime.now().isoformat(),
        "severity": "HIGH",
        "details": f"Admin {admin['name']} ({admin['id']}) deleted {role} {name} ({user_id}) and all linked data."
    }
    await db["threat_logs"].insert_one(audit_entry)

    return {"status": "success", "message": f"User {user_id} and all linked data deleted successfully."}
async def fetch_realtime_threats():
    logs_cursor = threat_logs_collection.find({}, {"_id": 0}).sort("timestamp_utc", -1).limit(25)
    return await logs_cursor.to_list(length=25)

@app.get("/api/admin/threat_logs", tags=["Admin"])
async def get_admin_threat_logs():
    """Returns the most recent 25 threat logs for live dashboard feed."""
    return await fetch_realtime_threats()

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
async def get_attack_ledger(page: int = Query(1, ge=1), limit: int = Query(50, ge=1)):
    """Full historical attack ledger with pagination with efficiency analytics."""
    skip = (page - 1) * limit
    total_defended = await threat_logs_collection.count_documents({})
    # No limit on maximum limit to allow for massive CSV exports from the UI
    cursor = threat_logs_collection.find({}, {"_id": 0}).sort("timestamp_utc", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=None if limit > 1000 else limit)
    
    # Compute summary analytics
    volumetric = sum(1 for l in logs if l.get("type") == "Volumetric Attack")
    intrusion = sum(1 for l in logs if l.get("type") == "Intrusion Attempt")
    unique_ips = len(set(l.get("ip", "") for l in logs))
    
    # Efficiency logic: total_attempts = defended + missed. 
    # For demo, we'll assume a 98.7% efficiency if there are threats, or 100% if empty.
    missed_attacks = int(total_defended * 0.013) if total_defended > 0 else 0
    total_attempts = total_defended + missed_attacks
    efficiency = round((total_defended / total_attempts * 100), 1) if total_attempts > 0 else 100.0
    
    return {
        "logs": logs,
        "total": total_defended,
        "total_records": total_defended,
        "page": page,
        "limit": limit,
        "summary": {
            "volumetric_attacks": volumetric,
            "intrusion_attempts": intrusion,
            "unique_hostile_ips": unique_ips,
            "total_attempts": total_attempts,
            "defended_count": total_defended,
            "efficiency": efficiency
        }
    }

@app.get("/api/admin/dashboard_summary", tags=["Admin"])
async def get_admin_dashboard_summary():
    """Compact summary of metrics for the admin KPI cards only."""
    print("📊 [BACKEND_DEBUG] Dashboard Summary API Hit")
    try:
        t_count = await threat_logs_collection.count_documents({})
        # Use case-insensitive regex to be safe about older/different data entries
        e_count = await users_collection.count_documents({"role": {"$regex": "^employee$", "$options": "i"}})
        h_count = await users_collection.count_documents({"role": {"$regex": "^employer$", "$options": "i"}})
        
        # Simple efficiency calculation
        missed = int(t_count * 0.013) if t_count > 0 else 0
        total_att = t_count + missed
        eff = round((t_count / total_att * 100), 1) if total_att > 0 else 100.0
        
        active_e = await active_sessions_collection.count_documents({"role": {"$regex": "^employee$", "$options": "i"}})
        active_h = await active_sessions_collection.count_documents({"role": {"$regex": "^employer$", "$options": "i"}})
        
        data = {
            "threats_blocked": t_count,
            "employee_count": e_count,
            "employer_count": h_count,
            "efficiency": eff,
            "active_employees": active_e,
            "active_employers": active_h
        }
        print(f"✅ [BACKEND_DEBUG] Summary Results: {data}")
        return data
    except Exception as e:
        print(f"❌ [BACKEND_DEBUG] Summary Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/user_registry", tags=["Admin"])
async def get_paginated_user_registry(
    page: int = 1, 
    limit: int = 30, 
    role: str = "all", 
    q: str = "", 
    sort: str = "default"
):
    """Full-featured user registry with search, sort, and robust error handling."""
    print(f"📡 Registry API hit: page={page}, role={role}, q='{q}', sort='{sort}'")
    query: Dict[str, Any] = {}
    
    # Role Filtering
    if role and role != "all":
        query["role"] = role
    
    # Search Logic (with regex safety)
    if q.strip():
        safe_q = re.escape(q.strip())
        query["$or"] = [
            {"name": {"$regex": safe_q, "$options": "i"}},
            {"company_name": {"$regex": safe_q, "$options": "i"}},
            {"email": {"$regex": safe_q, "$options": "i"}},
            {"employee_id": {"$regex": safe_q, "$options": "i"}},
            {"employer_id": {"$regex": safe_q, "$options": "i"}}
        ]
    
    # Sorting Logic
    sort_criteria = [("_id", -1)] # Default fallthrough
    if sort == "oldest":
        sort_criteria = [("created_at", 1)]
    elif sort == "newest":
        sort_criteria = [("created_at", -1)]
    elif sort == "a-z":
        sort_criteria = [("name", 1), ("company_name", 1)]
    elif sort == "z-a":
        sort_criteria = [("name", -1), ("company_name", -1)]
    elif sort == "id":
        sort_criteria = [("employee_id", 1), ("employer_id", 1)]

    try:
        total = await users_collection.count_documents(query)
        cursor = users_collection.find(query, {"_id": 0, "password": 0}).sort(sort_criteria).skip((page - 1) * limit).limit(limit)
        users = await cursor.to_list(length=limit)
        
        print(f"✅ Registry Success: Returned {len(users)} of {total} users")
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "users": users
        }
    except Exception as e:
        print(f"❌ Registry Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registry failure: {str(e)}")


@app.get("/api/admin/anomalies", tags=["Admin"])
async def get_admin_anomalies(page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=100), admin: dict = Depends(get_current_user)):
    """Fetch evaluations flagged as anomalies AND pending profile update requests with pagination."""
    try:
        # For simplicity in pagination, we'll treat update requests as the primary 'anomalies' stream
        # but could merge with behavioral flags if needed.
        query = {"status": "pending"}
        total = await update_requests_collection.count_documents(query)
        cursor = update_requests_collection.find(query, {"_id": 0}).sort("timestamp", -1).skip((page - 1) * limit).limit(limit)
        items = await cursor.to_list(length=limit)
        
        return {
            "anomalies": items,
            "total": total,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")

    # 1. Fetch Feedback Anomalies
    cursor_eval = evaluations_collection.find({"is_anomaly": True}, {"_id": 1, "evaluator_id": 1, "evaluatee_id": 1, "company_name": 1, "final_score": 1, "timestamp": 1, "role": 1})
    anomalies = []
    async for doc in cursor_eval:
        doc["_id"] = str(doc["_id"])
        doc["type"] = "evaluation_anomaly"
        anomalies.append(doc)
        
    # 2. Fetch Pending Update Requests
    cursor_req = update_requests_collection.find({"status": "pending"}, {"_id": 0})
    update_reqs = await cursor_req.to_list(length=100)
    for req in update_reqs:
        req["type"] = "update_request"
        anomalies.append(req)

    return {"anomalies": anomalies}

@app.post("/api/admin/resolve_update_request/{request_id}", tags=["Admin"])
async def resolve_update_request(request_id: str, action: str = Query(...), admin: dict = Depends(get_current_user)):
    if admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
        
    req = await update_requests_collection.find_one({"request_id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
        
    user_id = req["user_id"]
    
    if action == "approve":
        # When approved, we reset or increment the edit limits for the fields requested
        changes = req["requested_changes"]
        user_updates = {}
        for field in changes.keys():
            if field == "name": user_updates["name_edits_remaining"] = 5
            elif field == "dob": user_updates["dob_edits_remaining"] = 5
            elif field == "gender": user_updates["gender_edits_remaining"] = 5
            elif field == "company_name": user_updates["company_name_edits_remaining"] = 5
            elif field == "establishment_year": user_updates["establishment_year_edits_remaining"] = 5
            elif field == "phone": user_updates["phone_edits_remaining"] = 5 # Assuming phone also has a limit
        
        if user_updates:
            await users_collection.update_one(
                {"$or": [{"employee_id": user_id}, {"employer_id": user_id}]},
                {"$set": user_updates}
            )
        await update_requests_collection.update_one({"request_id": request_id}, {"$set": {"status": "approved", "resolved_by": admin["id"]}})
        
        # Notify user
        await notifications_collection.insert_one({
            "user_id": user_id, "title": "Update Request Approved",
            "message": "Admin has approved your edit request. Your edit limits have been reset.",
            "type": "System", "is_read": False, "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Audit Log
        await db["threat_logs"].insert_one({
            "event": "ADMIN_UPDATE_APPROVAL",
            "admin_id": admin["id"],
            "admin_name": admin["name"],
            "target_user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "details": f"Admin {admin['name']} approved profile update request for {user_id}. Fields reset: {list(user_updates.keys())}"
        })
        
        return {"message": "Update request approved. User limits reset."}
    else:
        await update_requests_collection.update_one({"request_id": request_id}, {"$set": {"status": "rejected", "resolved_by": admin["id"]}})
        # Notify user
        await notifications_collection.insert_one({
            "user_id": user_id, "title": "Update Request Rejected",
            "message": "Your profile update request was declined by admin.",
            "type": "System", "is_read": False, "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Audit Log
        await db["threat_logs"].insert_one({
            "event": "ADMIN_UPDATE_REJECTION",
            "admin_id": admin["id"],
            "admin_name": admin["name"],
            "target_user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "details": f"Admin {admin['name']} rejected profile update request for {user_id}."
        })
        return {"message": "Update request rejected."}

@app.post("/api/admin/resolve_anomaly/{eval_id}", tags=["Admin"])
async def resolve_evaluation_anomaly(eval_id: str, action: str = Query(...), admin: dict = Depends(get_current_user)):
    """Admin can 'verify' or 'dismiss' a flagged evaluation."""
    if admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
        
    if action not in ["verify", "dismiss"]:
        raise HTTPException(status_code=400, detail="Action must be 'verify' or 'dismiss'.")
        
    if action == "dismiss":
        # Remove the evaluation entirely or mark as dismissed
        await evaluations_collection.delete_one({"_id": ObjectId(eval_id)})
        
        # Audit Log
        await db["threat_logs"].insert_one({
            "event": "ADMIN_EVALUATION_DISMISSAL",
            "admin_id": admin["id"],
            "admin_name": admin["name"],
            "target_eval_id": eval_id,
            "timestamp": datetime.now().isoformat(),
            "details": f"Admin {admin['name']} dismissed evaluation anomaly {eval_id}."
        })
        return {"message": "Evaluation anomaly dismissed and removed from record."}
    else:
        # Mark as verified (is_anomaly = False)
        await evaluations_collection.update_one({"_id": ObjectId(eval_id)}, {"$set": {"is_anomaly": False}})
        
        # Audit Log
        await db["threat_logs"].insert_one({
            "event": "ADMIN_EVALUATION_VERIFICATION",
            "admin_id": admin["id"],
            "admin_name": admin["name"],
            "target_eval_id": eval_id,
            "timestamp": datetime.now().isoformat(),
            "details": f"Admin {admin['name']} verified evaluation anomaly {eval_id}."
        })
        return {"message": "Evaluation anomaly verified and cleared."}

@app.post("/api/admin/change_password", tags=["Admin"])
async def admin_change_password(data: AdminChangePasswordRequest, admin: dict = Depends(get_current_user)):
    """Dedicated secure endpoint for Admin passkey updates."""
    if admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized. Admin access required.")
        
    user = await users_collection.find_one({"role": "admin"})
    if not user:
        raise HTTPException(status_code=404, detail="Admin account not found.")
        
    if not verify_password(data.current_password, user["password"]):
        raise HTTPException(status_code=401, detail="Current passkey is incorrect.")
        
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New passkey cannot be the same as current.")
        
    if not validate_password_policy(data.new_password):
        raise HTTPException(status_code=400, detail="Passkey does not meet complexity requirements.")
        
    new_hash = get_password_hash(data.new_password)
    # Note: In a multi-admin setup, we'd update the specific admin record.
    # For now, it updates the global 'admin' role record.
    await users_collection.update_one({"role": "admin"}, {"$set": {"password": new_hash}})
    
    # Audit Log
    await db["threat_logs"].insert_one({
        "event": "ADMIN_PASSWORD_CHANGE",
        "admin_id": admin["id"],
        "admin_name": admin["name"],
        "timestamp": datetime.now().isoformat(),
        "severity": "MEDIUM",
        "details": f"Admin {admin['name']} ({admin['id']}) changed the administrative passkey."
    })
    
    return {"message": "Admin passkey updated successfully."}

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
    collection = db["professionals"]
    profile = await collection.find_one({"employee_id": emp_id}, {"_id": 0})
    if not profile: raise HTTPException(status_code=404, detail="Profile not found in CETS ecosystem.")
    
    # Ensure standing is present
    standing_info = get_academic_standing(profile.get("average_academic_score", 0))
    profile["academic_standing"] = standing_info
    
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
        
    matched_jobs: list[dict] = []
    
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
    u_matrix = cast(Any, tfidf_matrix[0:1])
    j_matrix = cast(Any, tfidf_matrix[1:])
    similarities = cosine_similarity(u_matrix, j_matrix).flatten()
    
    for i, score in enumerate(similarities):
        match_percentage = round(float(score) * 100)
        # Threshold for semantic match: > 5% similarity
        if match_percentage > 5:
            job_data = valid_jobs[i]
            job_data["match_score"] = match_percentage
            job_data["semantic_match"] = True
            matched_jobs.append(job_data)
    
    matched_jobs.sort(key=lambda x: x["match_score"], reverse=True)
    
    top_limit = 10
    top_jobs = cast(List[Any], matched_jobs[:top_limit])
    
    return {
        "employee": profile.get("name", employee_id),
        "total_matches": len(matched_jobs),
        "top_matches": top_jobs,
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
        query["job_title"] = cast(Any, {"$regex": re.escape(keyword), "$options": "i"})
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
            "academic_standing": profile.get("academic_standing", "N/A"),
            "behavioral_trust_score": profile.get("behavioral_trust_score", 0.0),
            "average_tenure": profile.get("average_tenure", 0.0),
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
                chat_msg.pop("_id", None)
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