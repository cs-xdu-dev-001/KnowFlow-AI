from __future__ import annotations

from typing import Any, Callable, Protocol

import requests
from pydantic import BaseModel, Field


class WebSearchArguments(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=10)


class WebSearchError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class WebSearchProvider(Protocol):
    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        ...


class TavilyWebSearch:
    endpoint = "https://api.tavily.com/search"

    def __init__(
        self,
        *,
        api_key: str,
        post_json: Callable[..., Any],
        timeout: int,
        max_results: int,
    ):
        self.api_key = api_key
        self.post_json = post_json
        self.timeout = timeout
        self.max_results = max(1, min(10, max_results))

    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        normalized_query = query.strip()
        if not normalized_query:
            raise WebSearchError(
                "web_search_invalid_query",
                "Search query cannot be empty.",
            )
        limit = max(1, min(self.max_results, top_k))
        try:
            response = self.post_json(
                self.endpoint,
                {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                {
                    "query": normalized_query,
                    "search_depth": "basic",
                    "max_results": limit,
                    "include_answer": False,
                    "include_raw_content": False,
                    "include_images": False,
                },
                self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.Timeout as exc:
            raise WebSearchError(
                "web_search_timeout",
                "Web search timed out.",
            ) from exc
        except Exception as exc:
            raise WebSearchError(
                "web_search_failed",
                "Web search request failed.",
            ) from exc
        if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
            raise WebSearchError(
                "web_search_invalid_response",
                "Web search returned an invalid response.",
            )
        normalized = []
        for item in payload["results"][:limit]:
            if not isinstance(item, dict) or not item.get("url"):
                continue
            try:
                score = float(item.get("score") or 0)
            except (TypeError, ValueError):
                score = 0.0
            normalized.append(
                {
                    "title": str(item.get("title") or item["url"])[:300],
                    "url": str(item["url"])[:2000],
                    "snippet": str(item.get("content") or "")[:1200],
                    "score": score,
                    "published_at": item.get("published_date"),
                }
            )
        return normalized
