import asyncio

from app.collectors.spider.collector import SpiderCollector
from app.models.operator import Operator
from app.models.spider_cluster import SpiderCluster


async def main():

    collector = SpiderCollector(

        cluster=SpiderCluster(
            name="HB9ON",
            host="spider.hb9on.net",
            init_commands=["SH/DX 30"],
        ),

        operator=Operator(
            callsign="HB9ISO",
        ),
    )

    await collector.connect()

    await collector.login()

    await collector.disconnect()


asyncio.run(main())
