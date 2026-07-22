from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MasterSpotModel(Base):
    """
    SQLAlchemy representation of a fused DX spot.
    """

    __tablename__ = "master_spots"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    callsign: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    frequency: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    mode: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="",
    )

    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    spot_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    sources: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    comments: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    sota_ref: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    pota_ref: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )
