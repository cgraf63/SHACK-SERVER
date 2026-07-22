from app.models.master_spot import MasterSpot
from app.models.spot import Spot
from app.repositories.memory_repository import MemoryRepository


class FusionEngine:
    """
    Fuses incoming Spot objects into MasterSpot objects.

    Spots with the same callsign, frequency and mode are merged into
    a single MasterSpot.
    """

    def __init__(self):
        self._repository = MemoryRepository()

    def _make_key(self, spot: Spot) -> str:
        return f"{spot.callsign.upper()}|{spot.frequency:.1f}|{spot.mode.upper()}"

    def add(self, spot: Spot) -> MasterSpot:
        key = self._make_key(spot)

        master = self._repository.get(key)

        if master is None:
            master = MasterSpot(
                callsign=spot.callsign,
                frequency=spot.frequency,
                mode=spot.mode,
                first_seen=spot.received_at,
		last_seen=spot.received_at,
                sources=[spot.source],
                comments=[spot.comment] if spot.comment else [],
                confidence=1.0,
            )

            self._repository.save(key, master)
            return master

        # Update existing MasterSpot
        master.last_seen = spot.received_at

        if spot.source not in master.sources:
            master.sources.append(spot.source)

        if spot.comment and spot.comment not in master.comments:
            master.comments.append(spot.comment)

        self._repository.save(key, master)

        return master

    def all(self) -> list[MasterSpot]:
        return self._repository.all()
