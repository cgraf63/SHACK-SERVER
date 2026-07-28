"""
Dashboard API

Provides aggregated dashboard information.
"""

from fastapi import APIRouter

from app.models.api.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(
    tags=["Dashboard"],
)

service = DashboardService()


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
)
def dashboard() -> DashboardResponse:
    """
    Return dashboard information.
    """

    return service.get_dashboard()
