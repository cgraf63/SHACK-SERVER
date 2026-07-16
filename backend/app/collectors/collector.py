from app.models.operator import Operator
from app.models.spider_cluster import SpiderCluster


class SpiderCollector:

    def __init__(
        self,
        cluster: SpiderCluster,
        operator: Operator,
    ):

        self.cluster = cluster
        self.operator = operator

    async def connect(self):

        print(
            f"Connecting to {self.cluster.name} "
            f"({self.cluster.host}:{self.cluster.port}) "
            f"as {self.operator.callsign}"
        )
    async def login(self):
        """Login to Spider Cluster using operator callsign."""

        print(f"Logging in as {self.operator.callsign}")

        self.writer.write(
            f"{self.operator.callsign}\n".encode()
        )

        await self.writer.drain()

        print("✓ Callsign sent")

