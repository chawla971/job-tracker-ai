from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    llm_provider: str = "openai"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_client_id: str = ""
    jwt_secret_key: str = "change-me-in-production"

    class Config:
        env_file = ".env"


settings = Settings()
