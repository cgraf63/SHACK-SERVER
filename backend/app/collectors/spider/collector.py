"""
SHACK-SERVER

Generic Spider Cluster Collector
"""

import asyncio

from app.models.operator import Operator
from app.models.spider_cluster import SpiderCluster


class SpiderCollector:
    """Generic collector for Spider DX Clusters."""

    def __init__(
        self,
        cluster: SpiderCluster,
        operator: Operator,
    ):
        self.cluster = cluster
        self.operator = operator

        self.reader = None
        self.writer = None

    async def connect(self):
        """Open TCP connection to the Spider Cluster."""

        print(
            f"Connecting to {self.cluster.name} "
            f"({self.cluster.host}:{self.cluster.port})..."
        )

        self.reader, self.writer = await asyncio.open_connection(
            self.cluster.host,
            self.cluster.port,
        )

        print("✅ TCP connection established")

    async def login(self):
        """Send operator callsign."""

        print(f"Logging in as {self.operator.callsign}")

        self.writer.write(
            f"{self.operator.callsign}\n".encode()
        )

        await self.writer.drain()

        print("✓ Callsign sent")

    async def initialize(self):
        """Send initialization commands."""

        print("Initializing cluster...")

        for command in self.cluster.init_commands:

            print(f"--> {command}")

            self.writer.write(
                f"{command}\n".encode()
            )

            await self.writer.drain()

            await asyncio.sleep(0.2)

    async def receive_line(self):
        """Receive one line from the cluster."""

        line = await self.reader.readline()

        text = line.decode(errors="ignore").rstrip()

        print(f"<-- {text}")

        return text

    async def disconnect(self):
        """Close TCP connection."""

        if self.writer:
            self.writer.close()
            await self.writer.wait_closed()

            print("Disconnected")

