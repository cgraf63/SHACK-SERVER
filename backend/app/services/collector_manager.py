"""
Collector manager.

Keeps track of all registered collectors and their runtime status.
"""

from app.models.collector_status import CollectorStatus


class CollectorManager:
    """
    Registry for all collectors.
    """

    def __init__(self) -> None:
        self._collectors: dict[str, CollectorStatus] = {}

    def register(self, collector: CollectorStatus) -> None:
        """
        Register or replace a collector.
        """
        self._collectors[collector.name] = collector

    def get(self, name: str) -> CollectorStatus | None:
        """
        Return a collector by name.
        """
        return self._collectors.get(name)

    def get_all(self) -> list[CollectorStatus]:
        """
        Return all registered collectors.
        """
        return sorted(
            self._collectors.values(),
            key=lambda collector: collector.name,
        )

    def remove(self, name: str) -> None:
        """
        Remove a collector.
        """
        self._collectors.pop(name, None)

    def clear(self) -> None:
        """
        Remove all collectors.
        """
        self._collectors.clear()

    def count(self) -> int:
        """
        Return number of registered collectors.
        """
        return len(self._collectors)
