"""
DXSpider parser for SHACK-SERVER.
"""

from app.models.spot import Spot
from app.parsers.parser import Parser


class SpiderParser(Parser):
    """
    Parses DXSpider DX Spot messages.
    """

    def parse(self, line: str) -> Spot:
        """
        Parse a DXSpider spot line into a Spot object.
        """
        raise NotImplementedError
