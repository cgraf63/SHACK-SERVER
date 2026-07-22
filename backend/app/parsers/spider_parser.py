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
        tokens = line.split()

        if len(tokens) < 5:
            raise ValueError("Invalid DXSpider spot")

        if tokens[0] != "DX" or tokens[1] != "de":
            raise ValueError("Not a DX spot")

        # "HB9ON:" -> "HB9ON"
        spotter = tokens[2].rstrip(":")

        frequency = float(tokens[3])

        callsign = tokens[4]

        mode = tokens[5] if len(tokens) > 5 else ""

        comment = " ".join(tokens[6:]) if len(tokens) > 6 else ""

        return Spot(
            source=spotter,
            spotter=spotter,
            callsign=callsign,
            frequency=frequency,
            mode=mode,
            comment=comment,
        )
