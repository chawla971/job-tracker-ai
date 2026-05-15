from typing import List
import anthropic

from app.llm.base import LLMProvider, Message


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str):
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    async def complete(self, system: str, messages: List[Message]) -> str:
        response = await self._client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system,
            messages=[{"role": m.role, "content": m.content} for m in messages],
        )
        return response.content[0].text if response.content else ""
