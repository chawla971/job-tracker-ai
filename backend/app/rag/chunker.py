from typing import List


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    """
    Split text into overlapping chunks of ~chunk_size characters.

    Overlap ensures context isn't lost at chunk boundaries — e.g. a sentence
    that straddles two chunks will appear in both, so a search for either half
    still finds it.

    For short texts (under chunk_size), returns a single chunk.
    """
    if not text or not text.strip():
        return []

    text = text.strip()

    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]

        # If we're not at the end of the text, try to break at a natural
        # boundary (sentence end or newline) rather than mid-word
        if end < len(text):
            for sep in [". ", "\n", " "]:
                bp = chunk.rfind(sep)
                if bp > chunk_size // 2:
                    end = start + bp + len(sep)
                    chunk = text[start:end]
                    break

        stripped = chunk.strip()
        if stripped:
            chunks.append(stripped)

        start = end - overlap
        # Guard against infinite loop if overlap >= chunk produced
        if start >= end:
            break

    return chunks
