"""
Base parser interface for SHACK-SERVER.
"""

from abc import ABC, abstractmethod

from app.models.spot import Spot


class Parser(ABC):
    """Abstract base class for all parsers."""

    @abstractmethod
    def parse(self, line: str) -> Spot:
        """Convert a raw message into a Spot."""
        raise NotImplementedError
