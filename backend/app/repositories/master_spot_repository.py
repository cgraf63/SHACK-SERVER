from abc import ABC, abstractmethod

from app.models.master_spot import MasterSpot


class MasterSpotRepository(ABC):
    """Abstract repository for MasterSpot storage."""

    @abstractmethod
    def get(self, key: str) -> MasterSpot | None:
        ...

    @abstractmethod
    def save(self, key: str, spot: MasterSpot) -> None:
        ...

    @abstractmethod
    def all(self) -> list[MasterSpot]:
        ...
