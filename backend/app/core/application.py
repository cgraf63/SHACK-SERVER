"""
SHACK-SERVER
Application Container
"""

from app.core.event_bus import EventBus
from app.core.logger import get_logger


class ShackServer:

    def __init__(self):

        self.logger = get_logger()

        self.event_bus = EventBus()

        self.logger.info("SHACK-SERVER Core initialized")
