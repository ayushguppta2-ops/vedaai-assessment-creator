# VedaAI — AI Assessment Creator

> Generate professional, structured exam question papers in seconds using Claude AI.

---

## Live Demo
- **Frontend:** [https://vedaai.vercel.app](https://vedaai.vercel.app)
- **Backend API:** [https://vedaai-api.railway.app](https://vedaai-api.railway.app)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Assignment   │  │  Paper View  │  │  Zustand Store      │  │
│  │ Form (Steps) │  │  (Rendered)  │  │  + WebSocket hook   │  │
│  └──────┬───────┘  └──────▲───────┘  └────────┬────────────┘  │
│         │ REST POST        │ REST GET           │ Socket.IO      │
└─────────┼──────────────────┼────────────────────┼───────────────┘
          │                  │                    │
┌─────────▼──────────────────┼────────────────────▼───────────────┐
│                     BACKEND (Node.js + Express)                  │
│  ┌───────────────┐  ┌──────┴──────┐  ┌─────────────────────┐   │
│  │  REST API     │  │  MongoDB    │  │  Socket.IO Server   │   │
│  │  /assignments │  │  (Mongoose) │  │  (Real-time events) │   │
│  └───────┬───────┘  └─────────────┘  └─────────────────────┘   │
│          │ enqueue job                                           │
│  ┌───────▼───────┐  ┌─────────────┐                            │
│  │  BullMQ Queue │  │  Redis      │                            │
│  │  (assessment- │  │  (cache +   │                            │
│  │   generation) │  │   job state)│                            │
│  └───────┬───────┘  └─────────────┘                            │
│          │                                                       │
│  ┌───────▼───────┐                                              │
│  │  BullMQ       │  ── calls ──▶  Anthropic Claude API         │
│  │  Worker       │               (claude-sonnet-4)              │
│  └───────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Flow
1. Teacher fills form → **POST /api/assignments**
2. Backend creates MongoDB document → adds job to **BullMQ queue**
3. **Worker** picks up job → calls **Claude AI** with structured prompt
4. Claude returns JSON → worker validates & saves to MongoDB
5. Worker emits `job:completed` via **Socket.IO**
6. Frontend receives event → shows generated paper instantly

---

## Tech Stack

| Layer     | Tech                                    |
|-----------|-----------------------------------------|
| Frontend  | Next.js 15, TypeScript, Zustand, Socket.IO Client |
| Backend   | Node.js, Express, TypeScript            |
| Database  | MongoDB (Mongoose)                      |
| Cache     | Redis                                   |
| Queue     | BullMQ                                  |
| AI        | Anthropic Claude (claude-sonnet-4)     |
| Deploy    | Vercel (frontend) + Railway (backend)   |

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or Upstash)
- Anthropic API key

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/vedaai.git
cd vedaai
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your keys
npm install
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with backend URL
npm install
npm run dev
```

App runs at **http://localhost:3000**

---

## Docker (Full Stack)

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

docker-compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: localhost:27017
- Redis: localhost:6379

---

## Environment Variables

### Backend (`.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vedaai
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## Deployment Guide

### Backend → Railway

1. Push to GitHub
2. New project on [railway.app](https://railway.app)
3. Add MongoDB + Redis plugins
4. Set environment variables
5. Deploy from GitHub

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to your Railway backend URL
3. Deploy

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assignments` | Create & queue assessment |
| GET | `/api/assignments` | List all assessments |
| GET | `/api/assignments/:id` | Get single assessment |
| POST | `/api/assignments/:id/regenerate` | Regenerate paper |
| DELETE | `/api/assignments/:id` | Delete assessment |
| GET | `/api/health` | Health check |

### WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join:assignment` | Client → Server | `assignmentId` |
| `job:progress` | Server → Client | `{ assignmentId, status, message, progress }` |
| `job:completed` | Server → Client | `{ assignmentId, generatedPaper, ... }` |
| `job:failed` | Server → Client | `{ assignmentId, message }` |

---

## Features

- ✅ Multi-step assignment creation form with validation
- ✅ File upload (PDF / TXT) for contextual question generation
- ✅ 5 question types: MCQ, Short Answer, Long Answer, True/False, Fill Blank
- ✅ Difficulty levels: Easy, Medium, Hard, Mixed
- ✅ Real-time generation progress via WebSocket
- ✅ BullMQ background job processing
- ✅ Redis caching for completed papers
- ✅ Structured paper with Sections (A, B, C…)
- ✅ Student info section (Name, Roll No, Section)
- ✅ Print / Download as PDF
- ✅ Regenerate paper action
- ✅ Difficulty badges on each question
- ✅ Dark mode UI with responsive layout
- ✅ Full TypeScript (frontend + backend)

---

## Folder Structure

```
vedaai/
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/
│   │   │   ├── assignment/   # Form, List components
│   │   │   ├── paper/        # PaperView component
│   │   │   └── ui/           # ProgressOverlay, shared
│   │   ├── hooks/            # useSocket
│   │   ├── store/            # Zustand store
│   │   └── types/            # TypeScript interfaces
│   └── Dockerfile
├── backend/
│   ├── src/
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # Express routes
│   │   ├── services/         # AI service, Queue setup
│   │   └── workers/          # BullMQ worker
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```
