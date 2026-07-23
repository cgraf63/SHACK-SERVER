"""
SHACK-SERVER

Processing pipeline for Spider Cluster messages.
"""

from app.classifiers.spider_classifier import SpiderClassifier
from app.fusion.fusion_engine import FusionEngine
from app.models.message_type import MessageType
from app.parsers.spider_parser import SpiderParser


class Pipeline:
    """
    Processing pipeline for incoming Spider Cluster lines.
    """

    def __init__(self, fusion: FusionEngine):

        self.classifier = SpiderClassifier()
        self.parser = SpiderParser()
        self.fusion = fusion

    async def process(self, line: str):
        """
        Process one incoming cluster line.
        """

        message_type = self.classifier.classify(line)

        #
        # Ignore everything except DX spots
        #
        if message_type != MessageType.DX_SPOT:
            return

        try:
            spot = self.parser.parse(line)
        except ValueError as ex:
            print(f"Parser error: {ex}")
            return

        self.fusion.add(spot)

        print(
            f"✓ Spot processed: "
            f"{spot.callsign} "
            f"{spot.frequency} "
            f"{spot.mode}"
        )
