from pydantic import BaseModel, Field


class DatabaseSettings(BaseModel):
    url: str = "sqlite:///data/shack_server.db"


class ClusterSettings(BaseModel):
    enabled: bool = True
    host: str
    port: int = 8000
    operator: str


class Settings(BaseModel):
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)

    hb9on: ClusterSettings = Field(
        default_factory=lambda: ClusterSettings(
            host="spider.hb9on.net",
            port=8000,
            operator="HB9ISO",
        )
    )


settings = Settings()
