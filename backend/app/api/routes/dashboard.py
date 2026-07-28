"""
Dashboard API

Provides aggregated dashboard information.
"""

from fastapi import APIRouter

from app.repositories.sqlite_repository import SQLiteRepository

router = APIRouter(
    tags=["Dashboard"],
)


@router.get("/dashboard")
def dashboard():
    """
    Return dashboard information.
    """

    repository = SQLiteRepository()

    try:
        processed_spots = repository.count()

        return {
            "summary": {
                "uptime": "0d 00h 00m",
                "processed_spots": processed_spots,
                "fusion_sources": 0,
                "latency_ms": 0,
                "cpu_percent": 0.0,
                "memory_percent": 0.0,
            },
            "station": {
                "radio": "Not Connected",
                "cat": False,
                "cluster": False,
                "internet": True,
                "audio": False,
                "ptt": False,
            },
            "propagation": {
                "solar_flux": 0,
                "a_index": 0,
                "k_index": 0,
            },
            "clusters": [],
            "recommendations": [],
            "priority_dx": [],
            "live_spots": [],
        }

    finally:
        repository.close()
