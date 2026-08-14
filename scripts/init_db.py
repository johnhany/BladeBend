"""初始化数据库：创建所有已注册的 ORM 表。

用法:
    uv run python scripts/init_db.py
"""

import sys
from pathlib import Path

# 将项目根目录加入 sys.path，使 `backend` 包可被直接导入。
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import Base, engine  # noqa: E402


def init_database() -> None:
    # 确保所有模型被导入，以便 Base.metadata 注册它们。
    import backend.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print(f"数据库初始化完成: {engine.url}")


if __name__ == "__main__":
    init_database()
