from abc import ABC, abstractmethod

from app.models.master_spot import MasterSpot


class MasterSpotRepository(ABC):
    """
    Abstract repository for MasterSpot storage.
    """

    @abstractmethod
    def get(self, key: str) -> MasterSpot | None:
        """
        Return a single MasterSpot by key.
        """
        ...

    @abstractmethod
    def save(self, key: str, spot: MasterSpot) -> None:
        """
        Store or update a MasterSpot.
        """
        ...

    @abstractmethod
    def all(self) -> list[MasterSpot]:
        """
        Return all stored MasterSpots.
        """
        ...

    @abstractmethod
    def count(self) -> int:
        """
        Return the total number of stored MasterSpots.
        """
        ...

    @abstractmethod
    def latest(self, limit: int = 10) -> list[MasterSpot]:
        """
        Return the most recently seen MasterSpots.
        """
        ...

    @abstractmethod
    def source_count(self) -> int:
        """
        Return the number of unique spot sources.
        """
        ...

    @abstractmethod
    def close(self) -> None:
        """
        Release repository resources.
        """
        ...
