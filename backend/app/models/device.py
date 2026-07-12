from pydantic import BaseModel
from typing import Optional


class Device(BaseModel):
    id: str
    name: str
    type: str
    online: bool = False
    ip: Optional[str] = None
    status: dict = {}
