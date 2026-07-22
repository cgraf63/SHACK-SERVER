from datetime import UTC, datetime

from pydantic import BaseModel, Field


class MasterSpot(BaseModel):
    """
    Represents the fused view of one DX station collected
    from multiple sources.
    """

    callsign: str
    frequency: float
    mode: str = ""

    first_seen: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_seen: datetime = Field(default_factory=lambda: datetime.now(UTC))

    sources: list[str] = Field(default_factory=list)
    comments: list[str] = Field(default_factory=list)

    confidence: float = 0.0

    sota_ref: str | None = None
    pota_ref: str |None = None
