from app.models.master_spot import MasterSpot
from app.repositories.master_spot_repository import MasterSpotRepository


class MemoryRepository(MasterSpotRepository):
    """In-memory implementation of the MasterSpot repository."""

    def __init__(self):
        self._spots: dict[str, MasterSpot] = {}

    def get(self, key: str) -> MasterSpot | None:
        return self._spots.get(key)

    def save(self, key: str, spot: MasterSpot) -> None:
        self._spots[key] = spot

    def all(self) -> list[MasterSpot]:
        return list(self._spots.values())
