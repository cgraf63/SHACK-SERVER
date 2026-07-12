"""
SHACK-SERVER
Core Events
"""

from enum import Enum


class EventType(str, Enum):
    RAW_SPOT_RECEIVED = "raw_spot_received"

    SPOT_CREATED = "spot_created"

    SPOT_UPDATED = "spot_updated"

    SOURCE_CONNECTED = "source_connected"

    SOURCE_DISCONNECTED = "source_disconnected"
