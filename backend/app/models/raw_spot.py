"""
SHACK-SERVER

RawSpot Model

Represents an unprocessed spot received from a source.
"""

from datetime import datetime
from pydantic import BaseModel


class RawSpot(BaseModel):
    source: str
    received_at: datetime
    raw_data: str
