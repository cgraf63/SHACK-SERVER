"""
DXSpider parser for SHACK-SERVER.
"""

from app.models.spot import Spot
from app.parsers.parser import Parser


class SpiderParser(Parser):
    """
    Parser for standard DXSpider DX spot messages.

    Supported examples:

    DX de HB9ON: 14074.0 DL1ABC FT8 CQ TEST
    DX de HB9ON: 14025.0 DL1ABC
    DX de HB9ON: 7025.5 DL1ABC CW UP 2
    DX de HB9ON: 28480.0 DL1ABC USB CQ DX
    """

    # Known operating modes
    KNOWN_MODES = {
        "CW",
        "SSB",
        "USB",
        "LSB",
        "AM",
        "FM",
        "FT8",
        "FT4",
        "RTTY",
        "PSK31",
        "PSK63",
        "JT65",
        "JT9",
        "SSTV",
        "MSK144",
    }

    def parse(self, line: str) -> Spot:
        """
        Parse a DXSpider spot into a Spot object.
        """

        tokens = line.split()

        # Minimum:
        # DX de HB9ON: 14074.0 DL1ABC
        if len(tokens) < 5:
            raise ValueError("Invalid DX spot")

        if tokens[0] != "DX" or tokens[1] != "de":
            raise ValueError("Not a DX spot")

        spotter = tokens[2].rstrip(":")

        try:
            frequency = float(tokens[3])
        except ValueError:
            raise ValueError("Invalid frequency")

        callsign = tokens[4]

        mode = ""
        comment = ""

        if len(tokens) > 5:
            candidate = tokens[5].upper()

            if candidate in self.KNOWN_MODES:
                mode = candidate
                comment = " ".join(tokens[6:])
            else:
                comment = " ".join(tokens[5:])

        return Spot(
            source=spotter,
            spotter=spotter,
            callsign=callsign,
            frequency=frequency,
            mode=mode,
            comment=comment,
        )
