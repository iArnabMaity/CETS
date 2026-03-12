# CETS - Blockchain-Verified Career Tracking & AI-Secured HR Ecosystem

CETS (Career Empowerment & Tracking System) is a high-performance HR management ecosystem designed for the modern era. It combines **Blockchain-Verified credentials**, **Generative AI for skill verification**, and a **Cognitive AI Firewall** to create a secure, tamper-proof, and premium recruitment experience.

---

## 🚀 Core Features

- **Double-Layer Verification**: 
  - **Blockchain Ledger**: All professional history (onboarding, relieving) is hashed and stored on a conceptual blockchain ledger for immutable verification.
  - **AI Skill Quiz (GROQ)**: Generative AI creates real-time, adaptive quizzes to verify candidate skills instantly.
- **Cognitive AI Firewall**: A behavioral and volumetric protection layer using Machine Learning (Scikit-Learn) to detect and block intrusion attempts in real-time.
- **Premium Dark Aesthetics**: A sleek, high-fidelity dark UI built with Framer Motion, Tsparticles, and Recharts for a futuristic look and feel.
- **Real-Time Data Overwatch**: Admin dashboard features live traffic monitoring, threat logging, and a global user registry.
- **Zero-Knowledge Architecture**: Secure data handling with P2P messaging and encrypted profile reveals.

---

## 🏗️ Technical Architecture

### Frontend (React + Vite)
- **Styling**: Vanilla CSS with Glassmorphism & Framer Motion animations.
- **Charts**: Recharts for live traffic and workforce analytics.
- **Security**: CAPTCHA system and Zero-Knowledge reveal protocols.
- **PDF Export**: html2pdf.js for generating secure CVs.

### Backend (Python + FastAPI)
- **API**: High-performance asynchronous endpoints via FastAPI.
- **Database**: MongoDB (Motor) for scalable document storage with TTL indexing.
- **Caching**: Redis for rapid lookup of registered employers and session states.
- **AI Engine**: Groq SDK for Generative AI and Scikit-Learn (Joblib) for the Cognitive Firewall.

---

## 🚦 Getting Started

### 📋 Prerequisites

#### **Windows**
1. **Python**: Download and install [Python 3.10+](https://www.python.org/downloads/windows/). Ensure "Add Python to PATH" is checked.
2. **Node.js**: Download and install [Node.js v18+](https://nodejs.org/).
3. **MongoDB**: Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
4. **Redis**: Download [Redis for Windows](https://github.com/tporadowski/redis/releases) or use Docker.

#### **macOS**
1. **Homebrew**: If not installed, run: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
2. **Python**: `brew install python` (v3.10+)
3. **Node.js**: `brew install node` (v18+)
4. **MongoDB**: `brew tap mongodb/brew && brew install mongodb-community`
5. **Redis**: `brew install redis`

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/cets.git
cd cets
```

### 2. Backend Configuration
Navigate to the backend directory and set up your environment.

**Windows (PowerShell/CMD):**
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

#### **Environment Variables**
Create a `.env` file in the `backend/` directory with the following keys:
```env
MONGO_URL=mongodb://localhost:27017/cets_database
JWT_SECRET=your_super_secret_jwt_key
GROQ_API_KEY=your_groq_api_key_here
OPENCLAW_API_KEY=your_openclaw_key
MCP_TOKEN=your_mcp_token
REDIS_URL=redis://localhost:6379
```

#### **Run the Backend**
```bash
python main.py
```

### 3. Frontend Configuration
Open a new terminal window for the frontend.

```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Project Structure

```text
├── backend/
│   ├── main.py              # Main FastAPI application entry point
│   ├── models/              # Pydantic models for data validation
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic (AI, Blockchain, Email)
│   ├── sync_database.py     # Database synchronization and mock data generator
│   └── requirements.txt     # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # UI Components (Dashboards, Auth, Landing)
│   │   ├── App.jsx          # Root component and routing
│   │   └── main.jsx         # Entry point
│   ├── package.json         # Frontend dependencies
│   └── vite.config.js       # Vite configuration
└── README.md                # Project documentation
```

---

## 🔍 Troubleshooting

- **Redis Connection Error**: Ensure the Redis server is running. On Windows, run `redis-server`. On macOS, run `brew services start redis`.
- **GROQ API Missing**: The AI skill verification requires a valid GROQ key. If missing, the feature will gracefully degrade, but verification will fail to start.
- **MongoDB Connection**: If using Atlas, ensure your IP address is whitelisted in the MongoDB Atlas dashboard.
- **Node Modules Error**: If you face issues after updating, try deleting `node_modules` and `package-lock.json` in the `frontend/` folder, then run `npm install` again.

---
*Built with ❤️ for the next generation of HR and Career Security.*
