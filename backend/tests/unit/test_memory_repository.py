from app.models.master_spot import MasterSpot
from app.repositories.memory_repository import MemoryRepository


def test_save_and_load():
    repo = MemoryRepository()

    spot = MasterSpot(
        callsign="HB9ISO",
        frequency=14074.0,
        mode="FT8",
    )

    repo.save("HB9ISO", spot)

    assert repo.get("HB9ISO") is spot
    assert len(repo.all()) == 1
