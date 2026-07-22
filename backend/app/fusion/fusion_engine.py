from app.models.master_spot import MasterSpot
from app.models.spot import Spot


class FusionEngine:
    """
    Fusion Engine.

    Combines identical spots from different sources into one MasterSpot.
    """

    def __init__(self):
        self._master_spots: dict[str, MasterSpot] = {}

    def _make_key(self, spot: Spot) -> str:
        return f"{spot.callsign.upper()}|{spot.frequency:.1f}|{spot.mode.upper()}"

    def add(self, spot: Spot) -> MasterSpot:
        key = self._make_key(spot)

        if key in self._master_spots:
            master = self._master_spots[key]

            if spot.source not in master.sources:
                master.sources.append(spot.source)

            if spot.comment and spot.comment not in master.comments:
                master.comments.append(spot.comment)

            master.last_seen = spot.received_at

            return master

        master = MasterSpot(
            callsign=spot.callsign,
            frequency=spot.frequency,
            mode=spot.mode,
            sources=[spot.source],
            comments=[spot.comment] if spot.comment else [],
            confidence=spot.confidence,
            first_seen=spot.received_at,
            last_seen=spot.received_at,
        )

        self._master_spots[key] = master

        return master

    def all(self) -> list[MasterSpot]:
        return list(self._master_spots.values())
