from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router as api_router

app = FastAPI(
    title="SchedulAI API",
    description="AI-Assisted CPU Scheduling Simulator Backend powered by a C++17 Scheduling Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
def root():
    return {
        "name": "SchedulAI API",
        "docs": "/docs",
        "health": "/api/health",
    }
