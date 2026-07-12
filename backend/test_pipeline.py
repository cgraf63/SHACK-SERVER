from app.collectors.mock.collector import MockCollector
from app.core.event_bus import EventBus
from app.core.events import EventType


def on_raw_spot(raw_spot):

    print("\n===== RAW SPOT RECEIVED =====")
    print(raw_spot.model_dump())


collector = MockCollector()

event_bus = EventBus()

event_bus.subscribe(
    EventType.RAW_SPOT_RECEIVED,
    on_raw_spot,
)

raw_spot = collector.receive()

event_bus.publish(
    EventType.RAW_SPOT_RECEIVED,
    raw_spot,
)
