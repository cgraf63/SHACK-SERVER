from datetime import UTC, datetime
from pathlib import Path


class LineRecorder:
    """Records every received line from a cluster."""

    def __init__(self, filename: str):
        self.path = Path(filename)

        # Verzeichnis automatisch anlegen
        self.path.parent.mkdir(parents=True, exist_ok=True)

    async def record(
        self,
        source: str,
        line: str,
    ):

        timestamp = datetime.now(UTC).isoformat()

        with self.path.open(
            "a",
            encoding="utf-8",
        ) as logfile:

            logfile.write(
                f"{timestamp} | {source} | {line}\n"
            )
