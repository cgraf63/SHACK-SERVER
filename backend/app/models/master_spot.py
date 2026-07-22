from datetime import UTC, datetime

from pydantic import BaseModel, Field


class MasterSpot(BaseModel):
    """
    Represents one fused DX station assembled from
    one or more cluster sources.
    """

    callsign: str
    frequency: float
    mode: str = ""

    first_seen: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )

    last_seen: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )

    sources: list[str] = Field(default_factory=list)

    comments: list[str] = Field(default_factory=list)

    confidence: float = 0.0

    spot_count: int = 1

    sota_ref: str | None = None

    pota_ref: str | None = None
