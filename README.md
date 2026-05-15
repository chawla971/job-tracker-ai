# Job Tracker AI

An AI-powered job application tracker that helps you manage your job search, prep for interviews, and get personalised insights from your own data.

---

## Features

- **Job pipeline** — track applications from Saved → Applied → Interviewing → Offer/Rejected with status badges and a pipeline breakdown
- **Contacts & networking** — log contacts with follow-up reminders and overdue alerts
- **Coffee chats** — schedule and note networking conversations with meeting links
- **Interviews** — track rounds with prep notes and post-interview reflections
- **AI Assistant** — RAG-powered chat that answers questions using your actual resume, job descriptions, and notes ("Find skill gaps", "Prep for my interview at Acme")
- **JD auto-fetch** — paste a job posting URL and auto-populate company, role, location, and full job description (supports Ashby, Greenhouse, Lever, and generic HTML)
- **JD auto-fill on paste** — paste a job description into the form and fields auto-populate via LLM extraction
- **CSV / Excel import** — import existing job trackers with column auto-detection, editable preview, and duplicate skipping
- **Google OAuth** — secure single-sign-on, each user's data is fully isolated
- **Dark mode** — persisted theme toggle in the sidebar
- **Dashboard** — action items, pipeline metrics, and recent activity at a glance

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL 16 + pgvector |
| AI / RAG | sentence-transformers (all-MiniLM-L6-v2), OpenAI gpt-4o-mini |
| Auth | Google OAuth 2.0, JWT (python-jose) |
| Infrastructure | Docker, docker-compose |

---

## Local Development Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A Google Cloud project with an OAuth 2.0 Web Client ID ([guide](https://console.cloud.google.com))
- An OpenAI API key ([platform.openai.com](https://platform.openai.com))

### 1. Clone the repo

```bash
git clone https://github.com/your-username/job-tracker-ai.git
cd job-tracker-ai
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `OPENAI_API_KEY` — your OpenAI key
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `JWT_SECRET_KEY` — any long random string (generate one with `python -c "import secrets; print(secrets.token_hex(32))"`)

### 3. Configure Google OAuth

In [Google Cloud Console](https://console.cloud.google.com):
1. Go to **APIs & Services → Credentials**
2. Create an OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:5173` as an authorised JavaScript origin
4. Add yourself as a test user under **OAuth consent screen → Test users**

### 4. Start the app

```bash
docker-compose up --build
```

First build takes ~10 minutes (downloads Python packages and the sentence-transformers model). Subsequent starts are fast.

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API docs:** http://localhost:8000/docs

### 5. Set yourself as admin (optional)

After signing in for the first time:

```bash
docker-compose exec postgres psql -U jobtracker -d jobtracker -c "UPDATE users SET is_admin = true WHERE email = 'your@email.com';"
```

Sign out and back in to see the Admin link in the sidebar.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string (default matches docker-compose) |
| `LLM_PROVIDER` | Yes | `openai` or `anthropic` |
| `OPENAI_API_KEY` | If using OpenAI | Your OpenAI API key |
| `ANTHROPIC_API_KEY` | If using Anthropic | Your Anthropic API key |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `JWT_SECRET_KEY` | Yes | Secret for signing JWTs — keep this long and random |

---

## Project Structure

```
job-tracker-ai/
├── backend/
│   ├── app/
│   │   ├── core/          # Auth, JWT, dependencies, shared prompts
│   │   ├── llm/           # LLM provider abstraction (OpenAI, Anthropic)
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── rag/           # Embedding pipeline, chunker, search
│   │   ├── routers/       # FastAPI route handlers
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   └── services/      # Business logic layer
│   └── migrations/        # Alembic migration scripts
└── frontend/
    └── src/
        ├── components/    # Reusable UI components
        ├── contexts/      # React context (auth)
        ├── hooks/         # Custom hooks
        ├── lib/           # Utilities (api wrapper, theme, time)
        ├── pages/         # Page components
        ├── services/      # API service layer
        └── types/         # TypeScript types
```
