import logging
from typing import List

log = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536
TIMEOUT = 30.0


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of strings via OpenAI text-embedding-3-small.
    Creates a fresh client per call to avoid thread-safety issues with the
    global singleton pattern (background tasks run in separate threads).
    Timeout=30s prevents silent hangs.
    """
    if not texts:
        return []

    from openai import OpenAI
    from app.config import settings

    client = OpenAI(api_key=settings.openai_api_key, timeout=TIMEOUT)
    log.info("[embed] Calling OpenAI: %d chunk(s)", len(texts))

    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    vectors = [item.embedding for item in sorted(response.data, key=lambda x: x.index)]

    log.info("[embed] Got %d vectors, dim=%d", len(vectors), len(vectors[0]) if vectors else 0)
    return vectors
