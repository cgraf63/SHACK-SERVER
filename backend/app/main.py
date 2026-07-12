from fastapi import FastAPI

app = FastAPI(
    title="SHACK SERVER",
    version="0.1"
)

@app.get("/")
def root():
    return {
        "status": "running",
        "server": "SHACK SERVER"
    }


from fastapi import FastAPI

from app.api.routes import health
from app.api.routes import radio
from app.api.routes import devices

app = FastAPI(title="SHACK SERVER")

app.include_router(health.router)
app.include_router(radio.router)
app.include_router(devices.router)
