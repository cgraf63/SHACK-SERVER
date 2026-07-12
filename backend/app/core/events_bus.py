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
    ):

        self._listeners[event].append(callback)

    def publish(
        self,
        event: EventType,
        payload: Any = None,
    ):

        for callback in self._listeners[event]:
            callback(payload)

    def unsubscribe(
        self,
        event: EventType,
        callback: Callable[[Any], None],
    ):

        if callback in self._listeners[event]:
            self._listeners[event].remove(callback)
