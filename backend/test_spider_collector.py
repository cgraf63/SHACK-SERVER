import asyncio

from app.collectors.spider.collector import SpiderCollector
from app.models.operator import Operator
from app.models.spider_cluster import SpiderCluster


async def main():

    collector = SpiderCollector(

        cluster=SpiderCluster(
            name="HB9ON",
            host="spider.hb9on.net",
            init_commands=[
                "SH/DX 30",
            ],
        ),

        operator=Operator(
            callsign="HB9ISO",
        ),
    )

    try:

        await collector.connect()

        await collector.receive_line()

        await collector.login()

        await collector.receive_line()

        await collector.initialize()

        # Jetzt einige Zeilen lesen
        for _ in range(10):
            await collector.receive_line()

    finally:

        await collector.disconnect()


asyncio.run(main())
