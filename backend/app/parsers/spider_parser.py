"""
DXSpider parser.
"""

from app.models.spot import Spot
from app.parsers.parser import Parser


class SpiderParser(Parser):

    def parse(self, line: str) -> Spot:
        raise NotImplementedError("Spider parser not implemented yet.")
