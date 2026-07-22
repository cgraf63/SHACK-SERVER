from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.master_spot import MasterSpot
from app.models.master_spot_model import MasterSpotModel
from app.repositories.sqlite_repository import SQLiteRepository


def test_sqlite_repository_save_and_load(tmp_path: Path):
    """
    Verify that a MasterSpot can be stored and loaded again.
    """

    db_file = tmp_path / "test.db"

    engine = create_engine(f"sqlite:///{db_file}")
    Session = sessionmaker(bind=engine)

    Base.metadata.create_all(engine)

    repo = SQLiteRepository()
    repo._session.close()
    repo._session = Session()

    spot = MasterSpot(
        callsign="HB9ISO",
        frequency=14074.0,
        mode="FT8",
        first_seen=datetime.now(UTC),
        last_seen=datetime.now(UTC),
        sources=["HB9ON"],
        comments=["CQ DX"],
        confidence=0.95,
        spot_count=3,
        sota_ref="HB/VD-001",
        pota_ref="CH-0001",
    )

    key = "HB9ISO|14074.0|FT8"

    repo.save(key, spot)

    loaded = repo.get(key)

    assert loaded is not None

    assert loaded.callsign == spot.callsign
    assert loaded.frequency == spot.frequency
    assert loaded.mode == spot.mode

    assert loaded.sources == spot.sources
    assert loaded.comments == spot.comments

    assert loaded.confidence == spot.confidence
    assert loaded.spot_count == spot.spot_count

    assert loaded.sota_ref == spot.sota_ref
    assert loaded.pota_ref == spot.pota_ref

    repo.close()
