from app.models.message_type import MessageType


class SpiderClassifier:
    """Classify Spider Cluster messages."""

    def classify(self, line: str) -> MessageType:

        line = line.strip()

        if line.startswith("DX de"):
            return MessageType.DX_SPOT

        if line.startswith("WWV"):
            return MessageType.WWV

        if line.startswith("WCY"):
            return MessageType.WCY

        if (
            line.startswith("Welcome")
            or line.startswith("login:")
            or line.startswith("running")
            or line.startswith("Capabilities:")
            or line.startswith("You must")
            or line.startswith("For registration")
            or line == "-"
        ):
            return MessageType.SYSTEM

        return MessageType.UNKNOWN

