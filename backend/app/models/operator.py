from pydantic import BaseModel


class Operator(BaseModel):
    callsign: str
    locator: str = ""
    name: str = ""

