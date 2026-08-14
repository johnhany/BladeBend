"""输电通道静态数据接口：GET /api/channels?status="""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/channels", tags=["channels"])

# data/channels.json 位于项目根目录
CHANNELS_FILE = Path(__file__).resolve().parents[2] / "data" / "channels.json"


@lru_cache
def _load_channels() -> dict[str, Any]:
    if not CHANNELS_FILE.exists():
        raise HTTPException(status_code=500, detail=f"通道数据文件不存在: {CHANNELS_FILE}")
    with open(CHANNELS_FILE, encoding="utf-8") as f:
        return json.load(f)


@router.get("")
def list_channels(
    status: str | None = Query(None, description="operational | under_construction | planned"),
) -> dict[str, Any]:
    data = _load_channels()
    channels = data.get("channels", [])
    if status:
        channels = [c for c in channels if c.get("status") == status]
    return {"data": channels, "total": len(channels)}
