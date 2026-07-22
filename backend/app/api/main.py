from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="SHACK-SERVER",
    description="Open-source platform for intelligent amateur radio information processing.",
    version="0.4.0",
)

app.include_router(router)
