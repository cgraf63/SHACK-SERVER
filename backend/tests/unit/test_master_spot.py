from app.models.master_spot import MasterSpot


def test_create_master_spot():

    spot = MasterSpot(
        callsign="HB9ISO",
        frequency=14074.0,
        mode="FT8",
    )

    assert spot.callsign == "HB9ISO"
    assert spot.frequency == 14074.0
    assert spot.mode == "FT8"

    assert spot.sources == []
    assert spot.comments == []

    assert spot.confidence == 0.0

    assert spot.first_seen is not None
    assert spot.last_seen is not None
