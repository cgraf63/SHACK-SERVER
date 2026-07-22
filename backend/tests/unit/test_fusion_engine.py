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
def test_fuse_identical_spots():
    engine = FusionEngine()

    spot1 = Spot(
        source="HB9ON",
        spotter="HB9ON",
        callsign="DL1ABC",
        frequency=14074.0,
        mode="FT8",
        comment="CQ TEST",
    )

    spot2 = Spot(
        source="DXSUMMIT",
        spotter="DXSUMMIT",
        callsign="DL1ABC",
        frequency=14074.0,
        mode="FT8",
        comment="CQ TEST",
    )

    master1 = engine.add(spot1)
    master2 = engine.add(spot2)

    # Es muss dasselbe MasterSpot-Objekt sein
    assert master1 is master2

    # Es darf nur einen MasterSpot geben
    assert len(engine.all()) == 1

    # Beide Quellen müssen enthalten sein
    assert sorted(master1.sources) == [
        "DXSUMMIT",
        "HB9ON",
    ]

    # Kommentar darf nicht doppelt vorkommen
    assert master1.comments == ["CQ TEST"]

