import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.routers import auth, context_agent, notebook_agent, research_agent
from core.database import engine, SessionLocal
from core.models import user_model

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend for ed-tech"
DASHBOARD_DIR = FRONTEND_DIR / "frontend"

# ── CORS: list specific origins so credentials (cookies) work ──
# Using '*' with allow_credentials=True is blocked by browsers.
# Add your production domain here when deploying.
app = FastAPI(
    title="EduSphere AI",
    description="Ed-Tech platform",
    version="1.0.0",
)

# Allow setting frontend url from environment for cross-platform deployments (like Vercel)
frontend_url = os.environ.get("FRONTEND_URL")
allowed_origins = [
    "*"
]
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,   # Required for cookie-based auth
)

# Create all database tables on startup
user_model.Base.metadata.create_all(bind=engine)

# ── Include API routers ──
app.include_router(auth.router)
app.include_router(context_agent.router)
app.include_router(notebook_agent.router)
app.include_router(research_agent.router)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/style.css", include_in_schema=False)
def serve_stylesheet():
    return FileResponse(FRONTEND_DIR / "style.css", media_type="text/css")


@app.get("/script.js", include_in_schema=False)
def serve_script():
    return FileResponse(FRONTEND_DIR / "script.js", media_type="application/javascript")


@app.get("/dashboard", include_in_schema=False)
def redirect_dashboard():
    return RedirectResponse(url="/dashboard/")


@app.get("/dashboard/", include_in_schema=False)
def serve_dashboard():
    return FileResponse(DASHBOARD_DIR / "dashboard.html")


@app.get("/dashboard/style.css", include_in_schema=False)
def serve_dashboard_stylesheet():
    return FileResponse(DASHBOARD_DIR / "style.css", media_type="text/css")


@app.get("/dashboard/dashboard.js", include_in_schema=False)
def serve_dashboard_script():
    return FileResponse(DASHBOARD_DIR / "dashboard.js", media_type="application/javascript")
