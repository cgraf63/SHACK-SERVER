from pydantic import BaseModel, Field


class DatabaseSettings(BaseModel):
    url: str = "sqlite:///data/shack_server.db"


class ClusterSettings(BaseModel):
    enabled: bool = True
    host: str
    port: int = 8000
    operator: str
    password: str = ""
    init_commands: list[str] = Field(default_factory=list)


class Settings(BaseModel):
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)

    hb9on: ClusterSettings = Field(
        default_factory=lambda: ClusterSettings(
            host="spider.hb9on.net",
            port=8000,
            operator="HB9ISO",
            init_commands=[
                "set/page 0",
                "set/beep 0",
            ],
        )
    )


settings = Settings()

