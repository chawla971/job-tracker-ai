from fastapi import HTTPException


def raise_for_llm_error(exc: Exception) -> None:
    """
    Map known LLM provider errors to HTTP status codes with friendly messages.
    Raises an HTTPException — never returns normally.
    Called in the except block of any LLM call.
    """
    msg = str(exc).lower()
    if "insufficient_quota" in msg or "quota" in msg:
        raise HTTPException(status_code=402, detail="OpenAI account has no credits. Add funds at platform.openai.com/settings/billing.")
    if "invalid_api_key" in msg or "authentication" in msg or "unauthorized" in msg:
        raise HTTPException(status_code=401, detail="Invalid API key. Check OPENAI_API_KEY in your .env file.")
    if "rate_limit" in msg:
        raise HTTPException(status_code=429, detail="Rate limit reached. Please wait a moment and try again.")
    raise HTTPException(status_code=500, detail=f"LLM error: {exc}")
