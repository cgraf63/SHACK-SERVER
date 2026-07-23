"""
SHACK-SERVER REST API
"""

from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="SHACK-SERVER",
    version="0.2.0",
    description="Open-source platform for intelligent amateur radio information processing.",
)

app.include_router(router)
