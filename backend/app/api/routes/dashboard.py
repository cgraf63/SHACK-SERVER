"""
Dashboard API

Provides aggregated dashboard information.
"""

from datetime import datetime

from fastapi import APIRouter

from app.core.application import ApplicationState
from app.models.api.dashboard import DashboardResponse, SpotSummaryModel
from app.repositories.sqlite_repository import SQLiteRepository

router = APIRouter(
    tags=["Dashboard"],
)


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
)
def dashboard():
    """
    Return dashboard information.
    """

    repository = SQLiteRepository()

    try:
        processed_spots = repository.count()
        fusion_sources = repository.source_count()
        latest_spots = repository.latest(10)

        now = datetime.now()

        live_spots = []

        for spot in latest_spots:
            age = max(
                0,
                int((now - spot.last_seen).total_seconds()),
            )

            live_spots.append(
                SpotSummaryModel(
                    callsign=spot.callsign,
                    frequency=spot.frequency,
                    mode=spot.mode,
                    source=", ".join(spot.sources),
                    age_seconds=age,
                    snr=None,
                    confidence=spot.confidence,
                )
            )

        return DashboardResponse(
            summary={
                "uptime": ApplicationState.uptime(),
                "processed_spots": processed_spots,
                "fusion_sources": fusion_sources,
                "latency_ms": 0,
                "cpu_percent": 0.0,
                "memory_percent": 0.0,
            },
            station={
                "radio": "Not Connected",
                "cat": False,
                "cluster": False,
                "internet": True,
                "audio": False,
                "ptt": False,
            },
            propagation={
                "solar_flux": 0,
                "a_index": 0,
                "k_index": 0,
            },
            clusters=[],
            recommendations=[],
            priority_dx=[],
            live_spots=live_spots,
        )

    finally:
        repository.close()
