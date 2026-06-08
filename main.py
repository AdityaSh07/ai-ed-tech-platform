print("STEP 1: Starting main.py")

from fastapi import FastAPI
print("STEP 2: FastAPI imported")

from fastapi.middleware.cors import CORSMiddleware
print("STEP 3: CORSMiddleware imported")

from app.routers import auth
print("STEP 4: auth router imported")

from app.routers import context_agent
print("STEP 5: context_agent router imported")

from app.routers import notebook_agent
print("STEP 6: notebook_agent router imported")

from core.database import engine
print("STEP 7: database engine imported")

from core.models import user_model
print("STEP 8: user_model imported")

app = FastAPI(
    title="EduSphere AI",
    description="Ed-Tech platform",
    version="1.0.0",
)

print("STEP 9: FastAPI app created")

frontend_url = "https://eduaihub-zeta.vercel.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("STEP 10: CORS configured")

print("STEP 11: Creating database tables")
user_model.Base.metadata.create_all(bind=engine)
print("STEP 12: Database tables created")

print("STEP 13: Registering auth router")
app.include_router(auth.router)

print("STEP 14: Registering context_agent router")
app.include_router(context_agent.router)

print("STEP 15: Registering notebook_agent router")
app.include_router(notebook_agent.router)

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"healthy": True}

print("STEP 16: Startup complete")