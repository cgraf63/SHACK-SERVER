"""
Spot normalizer for SHACK-SERVER.
"""

from app.models.spot import Spot


class SpotNormalizer:
    """
    Normalizes Spot objects before they enter the Fusion Engine.
    """

    def normalize(self, spot: Spot) -> Spot:
        """
        Normalize a Spot object.

        The object is modified in-place and returned.
        """

        # Callsign
        spot.callsign = spot.callsign.upper().strip()

        # Spotter
        spot.spotter = spot.spotter.upper().strip()

        # Source
        spot.source = spot.source.upper().strip()

        # Mode
        spot.mode = spot.mode.upper().strip()

        # Comment
        spot.comment = " ".join(spot.comment.split())

        return spot
