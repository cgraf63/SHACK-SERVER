"""
DXSpider parser for SHACK-SERVER.
"""

from app.models.spot import Spot
from app.parsers.parser import Parser


class SpiderParser(Parser):
    """
    Parser for standard DXSpider DX spot messages.

    Example:
        DX de HB9ON: 14074.0 DL1ABC FT8 CQ TEST
    """

    def parse(self, line: str) -> Spot:
        tokens = line.split()

        # Minimum:
        # DX de HB9ON: 14074.0 DL1ABC
        if len(tokens) < 5:
            raise ValueError("Invalid DX spot")

        if tokens[0] != "DX" or tokens[1] != "de":
            raise ValueError("Not a DX spot")

        spotter = tokens[2].rstrip(":")
        frequency = float(tokens[3])
        callsign = tokens[4]

        mode = ""
        comment = ""

        if len(tokens) >= 6:
            mode = tokens[5]

        if len(tokens) >= 7:
            comment = " ".join(tokens[6:])

        return Spot(
            source=spotter,
            spotter=spotter,
            callsign=callsign,
            frequency=frequency,
            mode=mode,
            comment=comment,
        )
