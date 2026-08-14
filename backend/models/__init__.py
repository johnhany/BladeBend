"""ORM 模型。

在此导入各模型，以便 Base.metadata 注册，支持 scripts/init_db.py 自动建表。
"""

from backend.models.capacity import ProvinceCapacity
from backend.models.price import ProvincePrice
from backend.models.trade import InterProvinceTrade

__all__ = ["ProvinceCapacity", "ProvincePrice", "InterProvinceTrade"]
