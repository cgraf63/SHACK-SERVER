from fastapi import APIRouter

from .dashboard import router as dashboard_router
from .health import router as health_router
from .spots import router as spots_router

router = APIRouter()

router.include_router(health_router)
router.include_router(spots_router)
router.include_router(dashboard_router)
