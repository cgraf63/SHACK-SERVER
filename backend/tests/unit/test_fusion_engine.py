from app.fusion.fusion_engine import FusionEngine
from app.models.spot import Spot


def test_add_single_spot():
    engine = FusionEngine()

    spot = Spot(
        source="HB9ON",
        spotter="HB9ON",
        callsign="HB9ISO",
        frequency=14074.0,
        mode="FT8",
        comment="CQ TEST",
    )

    master = engine.add(spot)

    assert master.callsign == "HB9ISO"
    assert master.frequency == 14074.0
    assert master.mode == "FT8"

    assert master.sources == ["HB9ON"]
    assert master.comments == ["CQ TEST"]

    assert len(engine.all()) == 1
