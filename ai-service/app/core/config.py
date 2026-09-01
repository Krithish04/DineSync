from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Centralized application settings, loaded from environment variables
    (and a local .env file during development).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000

    cors_origins: str = "http://localhost:5173,http://localhost:5000,http://localhost:3000"
    backend_api_url: str = "http://localhost:5000/api/v1"

    project_name: str = "DineSync AI - AI Service"
    api_v1_prefix: str = "/api/v1"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    hf_token: str = ""
    use_zero_shot_nlp: bool = False

    def model_post_init(self, __context) -> None:
        import os
        if self.hf_token:
            os.environ["HF_TOKEN"] = self.hf_token

    @property
    def cors_origins_list(self) -> List[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
