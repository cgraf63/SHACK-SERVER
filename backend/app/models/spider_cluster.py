from pydantic import BaseModel, Field


class SpiderCluster(BaseModel):
    name: str
    host: str
    port: int = 8000

    enabled: bool = True
    password: str = ""

    init_commands: list[str] = Field(default_factory=list)
