"""LLM client abstraction.

Any OpenAI-compatible endpoint works (OPENAI_API_KEY + optional
OPENAI_BASE_URL). Without credentials the diagnosis agent uses the
deterministic fallback — local dev never requires an LLM (NFR-05).
"""

from __future__ import annotations

import os
from typing import Protocol

import httpx


class LLMClient(Protocol):
    def complete(self, system: str, user: str) -> str: ...


class LLMUnavailable(RuntimeError):
    pass


class OpenAICompatClient:
    """Minimal chat-completions client returning raw text content."""

    def __init__(self, model: str | None = None, timeout_s: float = 30.0):
        self._api_key = os.getenv("OPENAI_API_KEY", "")
        if not self._api_key:
            raise LLMUnavailable("OPENAI_API_KEY not set")
        self._base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self._model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self._timeout = timeout_s

    def complete(self, system: str, user: str) -> str:
        try:
            resp = httpx.post(
                f"{self._base}/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={
                    "model": self._model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
                timeout=self._timeout,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError) as exc:
            raise LLMUnavailable(f"llm call failed: {exc}") from exc


def llm_from_env() -> LLMClient | None:
    try:
        return OpenAICompatClient()
    except LLMUnavailable:
        return None
