from pydantic import BaseModel


class SpiderCluster(BaseModel):
    name: str
    host: str
    port: int = 8000

    enabled: bool = True

    password: str = ""

    init_commands: list[str] = []
