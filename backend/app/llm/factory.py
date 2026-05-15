from app.llm.base import LLMProvider


def get_llm_provider() -> LLMProvider:
    """
    Return the configured LLM provider based on the LLM_PROVIDER env var.
    Import is deferred so the unused provider's SDK is never imported.
    """
    from app.config import settings

    provider = settings.llm_provider.lower()

    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set in your .env file")
        from app.llm.openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=settings.openai_api_key)

    if provider in ("anthropic", "claude"):
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set in your .env file")
        from app.llm.anthropic_provider import AnthropicProvider
        return AnthropicProvider(api_key=settings.anthropic_api_key)

    raise ValueError(
        f"Unknown LLM_PROVIDER '{provider}'. Set it to 'openai' or 'anthropic' in your .env file."
    )
