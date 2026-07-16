from datetime import datetime
from pydantic import BaseModel


class Spot(BaseModel):
    source: str
    spotter: str

    callsign: str
    frequency: float
    mode: str

    comment: str = ""

    received_at: datetime

