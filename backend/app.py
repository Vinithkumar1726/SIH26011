"""
SIH26011 - FastAPI Backend (Modular Version)
Real implementation with PostgreSQL + PostGIS
"""

import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from backend.config import settings
from backend.database import init_db, close_db, engine, Base
from backend.routes import include_routers
from backend.middleware.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="Real backend for 3D cadastral management",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS - using environment-based config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Include all routers
include_routers(app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)