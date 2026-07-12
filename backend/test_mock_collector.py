from app.collectors.mock.collector import MockCollector

collector = MockCollector()

raw_spot = collector.receive()

print(raw_spot.model_dump())
