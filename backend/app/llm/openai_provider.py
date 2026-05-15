from typing import List
from openai import AsyncOpenAI

from app.llm.base import LLMProvider, Message


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str):
        self._client = AsyncOpenAI(api_key=api_key)

    async def complete(self, system: str, messages: List[Message]) -> str:
        response = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                *[{"role": m.role, "content": m.content} for m in messages],
            ],
            max_tokens=1024,
            temperature=0.3,
        )
        return response.choices[0].message.content or ""
