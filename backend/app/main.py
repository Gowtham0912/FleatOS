"""
FastAPI application factory.

Wires together:
  - CORS middleware
  - Lifespan (startup / shutdown)
  - All routers
"""

import logging
from contextlib import asynccontextmanager

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db
from app.routes import auth, location, vehicles, websocket

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before the app starts accepting requests."""
    logger.info("⚡  Starting Fleet Tracking API…")
    await init_db()
    logger.info("✅  Database tables verified/created.")
    yield
    logger.info("🛑  Shutting down Fleet Tracking API.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Fleet Tracking API",
        description="MVP backend for real-time GPS fleet tracking.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # ── CORS — allow all origins so the phone browser can reach the API ────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Static files — serves gps_sender.html ─────────────────────────────────
    os.makedirs(STATIC_DIR, exist_ok=True)
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth.router)
    app.include_router(location.router)
    app.include_router(vehicles.router)
    app.include_router(websocket.router)

    @app.get("/gps", include_in_schema=False)
    async def gps_sender_page():
        """Serve the phone GPS sender page at /gps"""
        return FileResponse(os.path.join(STATIC_DIR, "gps_sender.html"))

    @app.get("/")
    async def root():
        return {
            "message": "Fleet Tracking API is running! 🚀",
            "docs": "/docs",
            "health": "/health",
            "gps_tracker": "/gps"
        }

    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
