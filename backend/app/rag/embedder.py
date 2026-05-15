from typing import List
from sentence_transformers import SentenceTransformer

# Module-level singleton — model is loaded once when the module is first
# imported, then reused for every subsequent call. Loading takes ~1s if
# already downloaded; the Dockerfile pre-downloads it so no network needed.
_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of text strings. Returns a list of 384-dim float vectors.
    Batches automatically handled by sentence-transformers.
    """
    if not texts:
        return []
    model = get_model()
    vectors = model.encode(texts, convert_to_numpy=True)
    return vectors.tolist()
