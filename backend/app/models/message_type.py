from enum import Enum


class MessageType(Enum):
    DX_SPOT = "dx_spot"
    WWV = "wwv"
    WCY = "wcy"
    SYSTEM = "system"
    UNKNOWN = "unknown"

