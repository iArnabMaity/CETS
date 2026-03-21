# CETS - Blockchain-Verified Career Tracking & AI-Secured HR Ecosystem

### Built With
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/iArnabMaity/CETS?utm_source=oss&utm_medium=github&utm_campaign=iArnabMaity%2FCETS&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

---

## Project Overview
CETS (Career Empowerment & Tracking System) is a high-performance HR management ecosystem natively designed to bridge the trust gap in the modern era. It combines **Conceptual Blockchain-Verified credentials**, **Generative AI strictly built for candidate evaluation**, and a robust **Cognitive AI Firewall** to curate a secure, tamper-proof, and premium recruitment infrastructure.

---

## 🚀 Core Architectural Features

- **Strict Identity Silos**: 
  - Entirely segmented authentication walls explicitly blocking cross-contamination between `Professional`, `Organization`, and `System Admin` portals at both the client and server levels.
- **Double-Layer Verification**: 
  - **Immutable Ledger Emulation**: All professional history (onboarding, relieving) is cryptographically hashed (SHA-256) and appended to a verifiable, read-only ledger.
  - **AI Cognitive Profiling (GROQ)**: Embedded Generative AI triggers adaptive, context-aware skill verification quizzes.
- **Cognitive AI Firewall & Premium Security**: 
  - **Volumetric Protection**: Scikit-Learn constraints paired with a randomized 3x3 Icon CAPTCHA.
  - **Passkey Hardening**: Integrated premium password change interface with real-time complexity validation (8+ chars, upper/lower, numeric, special) across all dashboard roles.
- **Employer CRM 2.0**: 
  - Advanced candidate management with high-fidelity card-based views, AI-driven trust score sorting, and enriched profile insights (Verified Job Ledger & About Me).
- **Global Responsive UI**: 
  - Adaptive "Overwatch" themed interface using Framer Motion and Tailwind v4, ensuring a premium experience on mobile, tablet, and desktop without functional degradation.

---

## 🏗️ Technical Stack

### Built With
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/iArnabMaity/CETS?utm_source=oss&utm_medium=github&utm_campaign=iArnabMaity%2FCETS&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat&logo=framer&logoColor=white)
![JSON Web Tokens](https://img.shields.io/badge/JSON_Web_Tokens-000000?style=flat&logo=jsonwebtokens&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat&logo=reactrouter&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat&logo=axios&logoColor=white)
![PostCSS](https://img.shields.io/badge/PostCSS-DD3A0A?style=flat&logo=postcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

### Frontend (React + Vite)
- **Framework**: React 19 + Vite 7 (High-performance HMR).
- **Styling**: TailwindCSS V4 & Modern Glassmorphism.
- **Animations**: Framer Motion, AOS (Animate on Scroll), and TS-Particles.
- **Charts**: Recharts & Chart.js for deep workforce analytics.
- **UI Components**: Lucide-React & Zero-Knowledge SweetAlert2.

### Backend (Python + FastAPI)
- **API**: Asynchronous FastAPI endpoints with Pydantic v2 validation.
- **Auth**: Salted Bcrypt hashing and JWT session management.
- **AI/ML**: GROQ (Generative AI), Scikit-Learn (Cognitive Firewall), and NLTK/Pandas.
- **Storage**: MongoDB (Persistent Data) & Redis (Real-time Caching).

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

## 📂 Project Tree Map

```text
├── backend/
│   ├── main.py              # Core API gateway & logic
│   ├── ml_training/         # Cognitive firewall & behavioral models
│   ├── sync_database.py     # Database schema synchronizer
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Containerization configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # Role-based Dashboards & common primitives
│   │   ├── utils/           # Shared helper functions
│   │   ├── assets/          # Static media & visuals
│   │   ├── App.jsx          # Session-persistent routing logic
│   │   └── index.css        # Global responsive theme variables
│   ├── tailwind.config.js   # Framework-level styling config
│   └── vite.config.js       # Bundler optimized for performance
└── README.md                # Technical Documentation
```

---

## 🔍 Diagnostics

- **Redis Handshake Refused**: Ensure the background active memory tier is running. (Windows: `redis-server` / macOS: `brew services run redis`).
- **GROQ Module Silent Failures**: AI skill integration absolutely requires a validated GROQ inference key. Check `.env`.
- **Database Abort Trace**: Double check your MongoDB daemon. If hosted on Atlas, guarantee your specific IPv4 mapping is explicitly whitelisted.
- **Node Compilation Halt**: In severe package desync scenarios, manually purge `node_modules` and `package-lock.json` directly from the `frontend/` scope and reboot `npm install`.

---

*Built for absolute structural integrity. Secured by SHA-256.*
