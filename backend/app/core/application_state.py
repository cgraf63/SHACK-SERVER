"""
Application runtime state.

Stores global runtime information about the SHACK-SERVER.
"""

from datetime import datetime


class ApplicationState:
    """
    Global application state.
    """

    _started_at = datetime.now()

    @classmethod
    def uptime(cls) -> str:
        """
        Return formatted application uptime.
        """

        delta = datetime.now() - cls._started_at

        days = delta.days
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60

        return f"{days}d {hours:02d}h {minutes:02d}m"

    @classmethod
    def started_at(cls) -> datetime:
        """
        Return application start time.
        """

        return cls._started_at
