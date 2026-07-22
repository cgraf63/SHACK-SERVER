from app.models.master_spot import MasterSpot
from app.models.spot import Spot


class FusionEngine:
    """
    First implementation of the Fusion Engine.

    Every Spot becomes one MasterSpot.
    No duplicate detection yet.
    """

    def __init__(self):
        self._master_spots: list[MasterSpot] = []

    def add(self, spot: Spot) -> MasterSpot:
        master = MasterSpot(
            callsign=spot.callsign,
            frequency=spot.frequency,
            mode=spot.mode,
            sources=[spot.source],
            comments=[spot.comment] if spot.comment else [],
            confidence=spot.confidence,
        )

        self._master_spots.append(master)

        return master

    def all(self) -> list[MasterSpot]:
        return self._master_spots
