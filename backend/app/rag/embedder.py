from typing import List

# Uses OpenAI text-embedding-3-small (1536 dims) instead of a local model.
# Benefits over sentence-transformers:
#   - No 90MB model download, no torch dependency — much smaller Docker image
#   - Better embedding quality for English job-search text
#   - No cold-start memory spike (was OOMing on Railway's free tier)
# Cost: ~$0.02 per 1M tokens — negligible for a personal job tracker.

_client = None


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI
        from app.config import settings
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


def embed_texts(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    client = _get_client()
    # OpenAI handles batching internally; max 2048 inputs per request
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    # Results are returned in the same order as input
    return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]
