from app.models.operator import Operator
from app.models.settings import Settings
from app.models.spider_cluster import SpiderCluster


settings = Settings(

    operator=Operator(
        callsign="HB9ISO",
        locator="JN36",
        name="Christoph",
    ),

    spider_clusters=[

        SpiderCluster(
            name="HB9ON",
            host="spider.hb9on.net",
        ),

        SpiderCluster(
            name="HB9IAC",
            host="dxc.iapc.ch",
        ),
    ],
)

print(settings.model_dump())
