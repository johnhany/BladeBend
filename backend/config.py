"""应用配置：通过环境变量 / .env 加载。"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # 后端
    debug: bool = True
    database_url: str = "sqlite:///./data/power_map.db"
    cors_origins: List[str] = ["http://localhost:8220"]

    # LLM（数据 Pipeline 使用，Phase 5 启用）
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, v: object) -> object:
        """允许 CORS_ORIGINS 以逗号分隔字符串的形式配置。"""
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


settings = Settings()


@lru_cache
def get_settings() -> Settings:
    """返回单例配置（供 FastAPI Depends 注入）。"""
    return Settings()
