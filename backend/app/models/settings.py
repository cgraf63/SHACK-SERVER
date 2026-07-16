from pydantic import BaseModel

from app.models.operator import Operator
from app.models.spider_cluster import SpiderCluster


class Settings(BaseModel):

    operator: Operator

    spider_clusters: list[SpiderCluster]
