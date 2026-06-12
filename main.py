import os
import warnings

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    context_agent,
    notebook_agent,
    research_agent
)

from core.database import engine
from core.models import user_model

with warnings.catch_warnings():
    warnings.filterwarnings(
        "ignore",
        message=".*not known to support structured output.*"
    )

app = FastAPI(
    title="EduSphere AI",
    description="Ed-Tech platform",
    version="1.0.0",
)

# CORS
frontend_url = os.getenv("FRONTEND_URL")

allowed_origins = []

if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
user_model.Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth.router)
app.include_router(context_agent.router)
app.include_router(notebook_agent.router)
app.include_router(research_agent.router)


@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "EduSphere AI API"
    }