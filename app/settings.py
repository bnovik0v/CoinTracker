from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings for the app."""
    
    api_version: str = "1.0.0"

    scrapestorm_api_key: str
    scrapestorm_base_url: str
    openai_api_key: str
    
    postgres_user: str
    postgres_password: str
    postgres_host: str
    postgres_port: int
    postgres_db: str
    sql_echo: bool = False
    
    @property
    def database_url(self) -> str:
        """Get database URL."""
        url = f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        return url

    class Config:
        """Config for the app."""

        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


def get_settings() -> Settings:
    """Get settings."""
    settings = Settings()
    return settings
