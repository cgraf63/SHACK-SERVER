"""
SHACK-SERVER
Internal Event Bus
"""

from collections import defaultdict
from typing import Any, Callable

from app.core.events import EventType


class EventBus:
    def __init__(self):
        self._listeners = defaultdict(list)

    def subscribe(
        self,
        event: EventType,
        callback: Callable[[Any], None],
    ) -> None:

        self._listeners[event].append(callback)

    def unsubscribe(
        self,
        event: EventType,
        callback: Callable[[Any], None],
    ) -> None:

        if callback in self._listeners[event]:
            self._listeners[event].remove(callback)

    def publish(
        self,
        event: EventType,
        payload: Any = None,
    ) -> None:

        for callback in self._listeners[event]:
            callback(payload)
