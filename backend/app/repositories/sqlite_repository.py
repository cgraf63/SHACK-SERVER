from sqlalchemy import select

from app.database import SessionLocal
from app.models.master_spot import MasterSpot
from app.models.master_spot_model import MasterSpotModel
from app.repositories.master_spot_repository import MasterSpotRepository


class SQLiteRepository(MasterSpotRepository):
    """
    SQLite implementation of the MasterSpot repository.
    """

    def __init__(self):
        self._session = SessionLocal()

    def get(self, key: str) -> MasterSpot | None:
        model = self._session.scalar(
            select(MasterSpotModel).where(MasterSpotModel.key == key)
        )

        if model is None:
            return None

        return self._from_model(model)

    def save(self, key: str, spot: MasterSpot) -> None:
        model = self._session.scalar(
            select(MasterSpotModel).where(MasterSpotModel.key == key)
        )

        if model is None:
            model = MasterSpotModel(key=key)
            self._session.add(model)

        self._to_model(model, spot)

        self._session.commit()

    def all(self) -> list[MasterSpot]:
        models = self._session.scalars(
            select(MasterSpotModel)
        ).all()

        return [self._from_model(model) for model in models]

    def _to_model(
        self,
        model: MasterSpotModel,
        spot: MasterSpot,
    ) -> None:
        model.callsign = spot.callsign
        model.frequency = spot.frequency
        model.mode = spot.mode

        model.first_seen = spot.first_seen
        model.last_seen = spot.last_seen

        model.sources = spot.sources
        model.comments = spot.comments

        model.confidence = spot.confidence
        model.spot_count = spot.spot_count

        model.sota_ref = spot.sota_ref
        model.pota_ref = spot.pota_ref

    def _from_model(
        self,
        model: MasterSpotModel,
    ) -> MasterSpot:
        return MasterSpot(
            callsign=model.callsign,
            frequency=model.frequency,
            mode=model.mode,
            first_seen=model.first_seen,
            last_seen=model.last_seen,
            sources=list(model.sources),
            comments=list(model.comments),
            confidence=model.confidence,
            spot_count=model.spot_count,
            sota_ref=model.sota_ref,
            pota_ref=model.pota_ref,
        )

    def close(self) -> None:
        self._session.close()

    def __del__(self):
        try:
            self.close()
        except Exception:
            pass
