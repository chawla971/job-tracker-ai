from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import jobs, contacts, coffee_chats, interviews, dashboard, profile, search, chat
from app.routers import scrape_jd, auth, import_jobs, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load the embedding model into memory before the first request.
    # Without this, the first save after startup blocks for 10-30s while
    # PyTorch and the model weights are loaded, making the server appear frozen.
    import asyncio
    import concurrent.futures
    from app.rag.embedder import get_model
    print("Loading embedding model into memory...")
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        await loop.run_in_executor(pool, get_model)
    print("Embedding model ready.")
    yield


app = FastAPI(title="Job Tracker API", version="0.4.0", lifespan=lifespan)

_allowed_origins = ["http://localhost:5173"]
if _frontend_url := __import__("os").getenv("FRONTEND_URL"):
    _allowed_origins.append(_frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(contacts.router, prefix="/api/contacts", tags=["contacts"])
app.include_router(coffee_chats.router, prefix="/api/coffee-chats", tags=["coffee-chats"])
app.include_router(interviews.router, prefix="/api/interviews", tags=["interviews"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(scrape_jd.router, prefix="/api/scrape-jd", tags=["scrape-jd"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(import_jobs.router, prefix="/api/jobs/import", tags=["import"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
