from pydantic import BaseModel
from typing import List


class SearchResultItem(BaseModel):
    source_type: str
    source_id: str
    chunk_index: int
    chunk_text: str
    distance: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
