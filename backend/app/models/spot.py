from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Spot(BaseModel):
    """
    Normalized spot object used throughout SHACK-SERVER.
    """

    id: UUID = Field(default_factory=uuid4)

    # Original information
    source: str
    spotter: str

    # DX information
    callsign: str
    frequency: float          # kHz
    mode: str
    comment: str = ""

    # Metadata
    received_at: datetime = Field(default_factory=datetime.utcnow)

    # Fusion
    sources: list[str] = Field(default_factory=list)

    # Calculated later
    confidence: float = 0.0
    relevance: float = 0.0

    distance_km: float | None = None
    bearing_deg: float | None = None

    # Future
    sota_ref: str | None = None
    pota_ref: str | None = None
