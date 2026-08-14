"""FastAPI 应用入口。"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.routers import capacity, price

app = FastAPI(
    title="全国电力数据可视化地图 API",
    version="0.1.0",
    description="提供各省装机量、电价、省间交易价格及输电通道数据。",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(capacity.router)
app.include_router(price.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    """健康检查端点。"""
    return {"status": "ok", "version": app.version}
