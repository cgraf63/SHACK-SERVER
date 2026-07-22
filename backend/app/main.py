"""
SHACK-SERVER

Main application entry point.
"""

import asyncio

from app.config.settings import load_settings
from app.collectors.spider.collector import SpiderCollector
from app.core.pipeline import Pipeline
from app.fusion.fusion_engine import FusionEngine
from app.models.operator import Operator
from app.models.spider_cluster import SpiderCluster
from app.repositories.sqlite_repository import SQLiteRepository


async def main():

    #
    # Load configuration
    #
    settings = load_settings()

    #
    # Repository
    #
    repository = SQLiteRepository()

    #
    # Fusion Engine
    #
    fusion = FusionEngine(repository)

    #
    # Processing Pipeline
    #
    pipeline = Pipeline(fusion)

    #
    # Build objects from configuration
    #
    operator = Operator(**settings["operator"])

    cluster = SpiderCluster(**settings["clusters"]["hb9on"])

    #
    # Collector
    #
    collector = SpiderCollector(
        cluster=cluster,
        operator=operator,
        pipeline=pipeline,
    )

    #
    # Start collector
    #
    await collector.connect()
    await collector.login()
    await collector.initialize()

    print("Receiving DX Cluster data...")

    try:
        await collector.receive_forever()

    finally:
        await collector.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
