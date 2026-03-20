# CETS - Blockchain-Verified Career Tracking & AI-Secured HR Ecosystem

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/iArnabMaity/CETS?utm_source=oss&utm_medium=github&utm_campaign=iArnabMaity%2FCETS&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

CETS (Career Empowerment & Tracking System) is a high-performance HR management ecosystem natively designed to bridge the trust gap in the modern era. It combines **Conceptual Blockchain-Verified credentials**, **Generative AI strictly built for candidate evaluation**, and a robust **Cognitive AI Firewall** to curate a secure, tamper-proof, and premium recruitment infrastructure.

---

## 🚀 Core Architectural Features

- **Strict Identity Silos**: 
  - Entirely segmented authentication walls explicitly blocking cross-contamination between `Professional`, `Organization`, and `System Admin` portals at both the client and server levels.
- **Double-Layer Verification**: 
  - **Immutable Ledger Emulation**: All professional history (onboarding, relieving) is cryptographically hashed (SHA-256) and appended to a verifiable, read-only ledger.
  - **AI Cognitive Profiling (GROQ)**: Embedded Generative AI triggers adaptive, context-aware skill verification quizzes.
- **Cognitive AI Firewall**: 
  - An underlying volumetric protection tier employing Scikit-Learn constraints alongside an interactive 3x3 randomized Icon Matrix CAPTCHA, completely locking out automated credential stuffing.
- **Premium User Experience**: 
  - Unparalleled high-fidelity glassmorphism built with absolute precision applying Framer Motion, Tsparticles, and Lucide abstractions overlaying a dynamically scaling Tailwind 4 + Vite stack.
- **Real-Time Organization Sync**: 
  - Granular dashboards displaying multi-factor workforce analytics (via Recharts and Chart.js v4), live threat logging, and an instantly synchronizable candidate registry.

---

## 🏗️ Technical Stack

### Frontend (React + Vite)
- **Framework**: React 19 driven by Vite 7 with absolute Hot Module Reloading.
- **Styling**: TailwindCSS V4 running native PostCSS alongside pure Glassmorphic CSS attributes.
- **Animations/Visuals**: Framer Motion (layout scale physics), AOS (scroll detection), and TS-Particles.
- **Form Controls**: SweetAlert2 (Zero-Knowledge alerts) and Intl-Tel-Input.
- **Routing**: React Router DOM (v7).

### Backend (Python + FastAPI)
- **API Engine**: High-performance asynchronous endpoints managed strictly by FastAPI.
- **Database & ODM**: MongoDB integrated dynamically via Motor (asynchronous bridging) and PyMongo.
- **Caching Ledger**: Redis pipelines guaranteeing zero-latency session continuity.
- **Machine Learning**: Scikit-Learn, NumPy, and Pandas generating behavioral metrics.
- **Security**: Complete JWT tokenization mapped to strictly-typed Pydantic schemas encasing bcrypt salted passlib hashes.

---

## 🚦 Getting Started

### 📋 Prerequisites

#### **Windows**
1. **Python**: Download and install [Python 3.10+](https://www.python.org/downloads/windows/). Ensure "Add Python to PATH" is checked.
2. **Node.js**: Download and install [Node.js v18+](https://nodejs.org/).
3. **MongoDB**: Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
4. **Redis**: Download [Redis for Windows](https://github.com/tporadowski/redis/releases) or bind it universally using Docker.

#### **macOS / Linux**
1. **Python**: `brew install python` (v3.10+)
2. **Node.js**: `brew install node` (v18+)
3. **MongoDB**: `brew tap mongodb/brew && brew install mongodb-community`
4. **Redis**: `brew install redis`

---

## 🛠️ Installation & Rapid Deployment

### 1. Clone the Ecosystem
```bash
git clone https://github.com/your-repo/cets.git
cd cets
```

### 2. Backend Initialization
Deploy your python Virtual Environment and install matrix handlers.

**Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

**macOS/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### **Environment Keys**
Establish a `.env` file in your `backend/` directory exposing these attributes:
```env
MONGO_URL=mongodb://localhost:27017/cets_database
JWT_SECRET=your_super_secret_jwt_key
GROQ_API_KEY=your_groq_api_key_here
REDIS_URL=redis://localhost:6379
```

#### **Spin up Uvicorn Engine**
```bash
python main.py
```

### 3. Frontend Initialization
Boot a secondary Terminal to deploy the Vite bundler.

```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Project Tree map

```text
├── backend/
│   ├── main.py              # Root FastAPI cluster mapping models & active routes
│   ├── models/              # Pydantic schema validation objects
│   ├── routes/              # Explicit API routing (Auth, Users, Analytics)
│   ├── services/            # Microservices (GROQ integration, Redis execution)
│   ├── sync_database.py     # Structural schema synchronizer
│   └── requirements.txt     # Locked production dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Glassmorphism encapsulated interface modules
│   │   ├── App.jsx          # Secure view renderer enforcing Auth endpoints
│   │   ├── index.css        # Core stylesheet integrating absolute theme configurations
│   │   └── main.jsx         # Vite injection target
│   ├── package.json         # Explicit layout dependencies (AOS, Motion, Charts)
│   └── vite.config.js       # Vite build layer map
└── README.md                # System Overview
```

---

## 🔍 Diagnostics

- **Redis Handshake Refused**: Ensure the background active memory tier is running. (Windows: `redis-server` / macOS: `brew services run redis`).
- **GROQ Module Silent Failures**: AI skill integration absolutely requires a validated GROQ inference key. Check `.env`.
- **Database Abort Trace**: Double check your MongoDB daemon. If hosted on Atlas, guarantee your specific IPv4 mapping is explicitly whitelisted.
- **Node Compilation Halt**: In severe package desync scenarios, manually purge `node_modules` and `package-lock.json` directly from the `frontend/` scope and reboot `npm install`.

---

*Built for absolute structural integrity. Secured by SHA-256.*
