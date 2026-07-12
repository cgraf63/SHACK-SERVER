from app.core.event_bus import EventBus

bus = EventBus()


def hello(event):

    print("Event received:", event)


bus.subscribe("test", hello)

bus.publish("test", "Hello SHACK")
