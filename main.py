from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, context_agent, notebook_agent, research_agent
from core.database import engine
from core.models import user_model

app = FastAPI(
    title="EduSphere AI",
    description="Ed-Tech platform",
    version="1.0.0",
)

# CORS
frontend_url = "https://eduaihub-zeta.vercel.app/"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
user_model.Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth.router)
app.include_router(context_agent.router)
app.include_router(notebook_agent.router)
app.include_router(research_agent.router)

@app.get("/health")
def health():
    return {"healthy": True}