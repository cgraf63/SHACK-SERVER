"""
Collector status model.

Represents the runtime status of a collector.
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class CollectorStatus:
    """
    Runtime information about a collector.
    """

    name: str

    enabled: bool = True
    connected: bool = False

    last_seen: datetime | None = None

    spots_received: int = 0
    reconnects: int = 0
    errors: int = 0
