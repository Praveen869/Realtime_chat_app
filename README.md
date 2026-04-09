# 💬 Real-Time Anonymous ChatApp

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A full-stack, real-time anonymous chat application built with **FastAPI** (Python) and **React** (Vite).- **Anonymous & Ephemeral** — No accounts, no database, messages are not stored

---

## 📸 Screenshots

Login Screen
<br>
<img src="login.png" width="800" alt="Username Entry Screen" />

Room List Interface
<br>
<img src="Room.png" width="800" alt="Room List" />

Main Chat Interface
<br>
<img src="chatinterface.png" width="800" alt="Chat Interface" />

---

## ✨ Features

- **Real-Time Messaging** — Instant communication via WebSockets with no page reload
- **Anonymous Architecture** — No accounts, no database, no stored messages
- **Multi-Room System** — Create any room; share the name to invite others
- **Live User List** — See who is online in the sidebar (desktop)
- **Security Limits** — Built-in protection against spam, memory exhaustion, and oversized payloads
- **Responsive UI** — Works on mobile and desktop with a dark-mode design
- **CI Pipeline** — Automated code quality checks on every push via GitLab CI

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TailwindCSS |
| Backend | Python 3, FastAPI, Uvicorn (ASGI) |
| Real-Time | WebSockets (native browser API + FastAPI) |
| Deployment | Vercel (frontend) + Render (backend) |
| CI | GitLab CI (automated build & syntax checks) |

---

## 🚀 Deployed App

| Service | URL |
|---------|-----|
| Frontend (Vercel) | *Your Vercel URL here* |
| Backend (Render) | *Your Render URL here* |

---

## 🔒 Security Features

| Protection | Details |
|-----------|---------|
| Username length limit | Max 20 characters (enforced on server) |
| Room name length limit | Max 20 characters (enforced on server) |
| Message length limit | Max 500 characters per message |
| Max users per room | 50 users |
| Max total rooms | 500 rooms |
| CORS | Configured via FastAPI middleware |

---

## 📁 Project Structure

```
chatapp/
├── backend/
│   ├── main.py              # FastAPI app — WebSocket logic, room management
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Root component — routing between screens
│   │   └── components/
│   │       ├── UsernameScreen.jsx  # Name entry screen
│   │       ├── RoomList.jsx        # Room browser + creation
│   │       └── ChatScreen.jsx      # Live chat UI with WebSocket
│   ├── .env.example          # Environment variable template
│   ├── package.json
│   └── vite.config.js
├── .gitlab-ci.yml            # GitLab CI pipeline
├── .gitignore
└── README.md
```


## 🧠 How It Works

- Users enter a username and join/create a room
- A WebSocket connection is established with the FastAPI backend
- Each room maintains active connections in memory
- Messages are broadcasted to all users in the same room instantly
- No data is stored — all messages are ephemeral


---

## ⚙️ Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Clone the Repository

```bash
git clone https://github.com/Praveen869/Realtime_chat_app.git
cd chatapp
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`

Test it: Open `http://localhost:8000/` — should return `{"message": "Server is working!"}`

### 3. Frontend Setup

Open a **new terminal window**:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 4. Environment Variables (Optional for Local)

Copy the example file:
```bash
cp frontend/.env.example frontend/.env
```

For local development, the defaults already point to `localhost:8000` so no changes are needed.

For production, set these in your Vercel dashboard:
```
VITE_API_BASE_URL=https://your-render-url.onrender.com
VITE_WS_BASE_URL=wss://your-render-url.onrender.com
```

---

## 🔄 GitLab CI Pipeline

Every push to the `main` branch triggers an automated pipeline with 2 jobs:

```
Stage 1: check
  └── backend  → pip install + python syntax check on main.py

Stage 2: build
  └── frontend → npm ci + npm run build (full Vite production build)
```

View pipelines at: [GitLab → Build → Pipelines](https://gitlab.com/praveen869-group/chatapp/-/pipelines)

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).
