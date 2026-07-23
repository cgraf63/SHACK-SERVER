"""
SHACK-SERVER

Application Container
"""

import asyncio

from app.collectors.spider.collector import SpiderCollector
from app.config.settings import settings
from app.core.event_bus import EventBus
from app.core.logger import get_logger
from app.core.pipeline import Pipeline
from app.fusion.fusion_engine import FusionEngine
from app.models.operator import Operator
from app.models.spider_cluster import SpiderCluster
from app.repositories.sqlite_repository import SQLiteRepository


class ShackServer:
    """
    Main application container.

    Creates and connects all application components.
    """

    def __init__(self):

        self.logger = get_logger()
        self.event_bus = EventBus()

        self.settings = settings

        #
        # Repository
        #
        self.repository = SQLiteRepository()

        #
        # Fusion Engine
        #
        self.fusion = FusionEngine(self.repository)

        #
        # Processing Pipeline
        #
        self.pipeline = Pipeline(self.fusion)

        #
        # Collectors
        #
        self.collectors = []

        hb9on = SpiderCluster(
            name="HB9ON",
            host=self.settings.hb9on.host,
            port=self.settings.hb9on.port,
            enabled=self.settings.hb9on.enabled,
            password=self.settings.hb9on.password,
            init_commands=self.settings.hb9on.init_commands,
        )

        operator = Operator(
            callsign=self.settings.hb9on.operator,
        )

        self.collectors.append(
            SpiderCollector(
                cluster=hb9on,
                operator=operator,
                pipeline=self.pipeline,
            )
        )

        self.logger.info("SHACK-SERVER initialized")

    async def start(self):
        """
        Connect and initialize all collectors.
        """

        self.logger.info("Starting collectors...")

        for collector in self.collectors:
            await collector.connect()
            await collector.login()
            await collector.initialize()

        self.logger.info("Collectors started.")

    async def run(self):
        """
        Start receiving data from all collectors.
        """

        self.logger.info("Receiving cluster data...")

        await asyncio.gather(
            *(collector.receive_forever() for collector in self.collectors)
        )

    async def stop(self):
        """
        Disconnect all collectors.
        """

        self.logger.info("Stopping collectors...")

        for collector in self.collectors:
            await collector.disconnect()

