"""
Dashboard service.

Builds the complete dashboard response.
"""

from datetime import datetime

from app.core.application import ApplicationState
from app.models.api.dashboard import DashboardResponse, SpotSummaryModel
from app.repositories.sqlite_repository import SQLiteRepository


class DashboardService:
    """
    Service responsible for building the dashboard response.
    """

    def __init__(self) -> None:
        self.repository = SQLiteRepository()

    def get_dashboard(self) -> DashboardResponse:
        """
        Build and return the dashboard response.
        """

        try:
            processed_spots = self.repository.count()
            fusion_sources = self.repository.source_count()
            latest_spots = self.repository.latest(10)

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
            self.repository.close()
