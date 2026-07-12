"""
SHACK-SERVER
Core Application

The central application container.
All core services are created and managed here.
"""

from app.core.event_bus import EventBus
from app.core.logger import get_logger


class ShackServer:
    """Central application container."""

    def __init__(self):
        self.logger = get_logger()
        self.event_bus = EventBus()

        # will be added in later milestones
        self.database = None
        self.source_manager = None
        self.spot_manager = None
        self.websocket = None

        self.logger.info("SHACK-SERVER Core initialized")
