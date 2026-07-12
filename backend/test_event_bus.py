from app.core.event_bus import EventBus
from app.core.events import EventType


def on_raw_spot(payload):
    print(f"Received: {payload}")


bus = EventBus()

bus.subscribe(
    EventType.RAW_SPOT_RECEIVED,
    on_raw_spot,
)

bus.publish(
    EventType.RAW_SPOT_RECEIVED,
    "HB9ON: VK9AA 14025 CW",
)
