from pathlib import Path
import sys

import requests


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from knowflow.services.web_search import TavilyWebSearch, WebSearchError


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self.payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"status={self.status_code}")

    def json(self):
        return self.payload


def main() -> None:
    calls = []

    def post_json(url, headers, payload, timeout):
        calls.append((url, headers, payload, timeout))
        return FakeResponse(
            {
                "results": [
                    {
                        "title": "Current source",
                        "url": "https://example.com/current",
                        "content": "Current information",
                        "score": 0.9,
                        "published_date": "2026-07-24",
                    }
                ]
            }
        )

    provider = TavilyWebSearch(
        api_key="unit-test-key",
        post_json=post_json,
        timeout=7,
        max_results=5,
    )
    results = provider.search(" current information ", top_k=3)
    url, headers, payload, timeout = calls[0]
    assert url == "https://api.tavily.com/search"
    assert headers["Authorization"] == "Bearer unit-test-key"
    assert payload["query"] == "current information"
    assert payload["max_results"] == 3
    assert payload["search_depth"] == "basic"
    assert payload["include_answer"] is False
    assert payload["include_raw_content"] is False
    assert timeout == 7
    assert results == [
        {
            "title": "Current source",
            "url": "https://example.com/current",
            "snippet": "Current information",
            "score": 0.9,
            "published_at": "2026-07-24",
        }
    ]

    timeout_provider = TavilyWebSearch(
        api_key="unit-test-key",
        post_json=lambda *_args, **_kwargs: (_ for _ in ()).throw(requests.Timeout()),
        timeout=7,
        max_results=5,
    )
    try:
        timeout_provider.search("timeout")
        raise AssertionError("timeout should raise WebSearchError")
    except WebSearchError as exc:
        assert exc.code == "web_search_timeout"

    invalid_provider = TavilyWebSearch(
        api_key="unit-test-key",
        post_json=lambda *_args, **_kwargs: FakeResponse({"results": "invalid"}),
        timeout=7,
        max_results=5,
    )
    try:
        invalid_provider.search("invalid")
        raise AssertionError("invalid response should raise WebSearchError")
    except WebSearchError as exc:
        assert exc.code == "web_search_invalid_response"

    print("Tavily search requests and errors are normalized")


if __name__ == "__main__":
    main()
