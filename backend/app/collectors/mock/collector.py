"""
SHACK-SERVER

Mock Collector
"""

from datetime import datetime

from app.models.raw_spot import RawSpot


class MockCollector:
    """Simple collector used for testing the pipeline."""

    def receive(self) -> RawSpot:
        return RawSpot(
            source="HB9ON",
            received_at=datetime.now(),
            raw_data="DX de HB9ON: VK9AA 14025 CW UP2",
        )
