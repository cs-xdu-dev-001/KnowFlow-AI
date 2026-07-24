"""Network and header policy for remote MCP servers."""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit
from typing import Callable, Iterable

_HOP_BY_HOP = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"}
_BLOCKED = _HOP_BY_HOP | {"host", "cookie", "mcp-session-id"}

def _addresses(host: str, port: int, resolver: Callable | None) -> list[str]:
    fn = resolver or socket.getaddrinfo
    raw = fn(host, port)
    out = []
    for item in raw:
        value = item[4][0] if isinstance(item, tuple) and len(item) >= 5 and isinstance(item[4], tuple) else item
        out.append(str(value))
    return out

def validate_remote_url(url: str, *, resolver: Callable | None = None, allow_private: bool = False) -> str:
    if not isinstance(url, str) or "\r" in url or "\n" in url:
        raise ValueError("invalid_url")
    parts = urlsplit(url)
    if parts.scheme.lower() not in (("http", "https") if allow_private else ("https",)):
        raise ValueError("insecure_scheme")
    if not parts.hostname or parts.username is not None or parts.password is not None or parts.fragment:
        raise ValueError("invalid_url")
    host = parts.hostname.rstrip(".").lower()
    if host in {"localhost", "metadata.google.internal", "metadata.google.com", "instance-data.ec2.internal"}:
        if not allow_private: raise ValueError("private_address")
    try:
        literal = ipaddress.ip_address(host)
        if not allow_private and not literal.is_global:
            raise ValueError("private_address")
    except ValueError as exc:
        if str(exc) == "private_address":
            raise
    try:
        port = parts.port or (443 if parts.scheme.lower() == "https" else 80)
    except ValueError as exc:
        raise ValueError("invalid_port") from exc
    try:
        addrs = _addresses(host, port, resolver)
    except Exception as exc:
        raise ValueError("dns_failure") from exc
    if not addrs:
        raise ValueError("dns_failure")
    for raw in addrs:
        try: addr = ipaddress.ip_address(raw.split("%", 1)[0])
        except ValueError as exc: raise ValueError("invalid_address") from exc
        if not allow_private and not addr.is_global:
            raise ValueError("private_address")
    return url

def validate_static_headers(headers: dict) -> dict[str, str]:
    if not isinstance(headers, dict): raise ValueError("invalid_headers")
    result: dict[str, str] = {}
    for key, value in headers.items():
        name, text = str(key), str(value)
        if not name or "\r" in name or "\n" in name or name.strip() != name:
            raise ValueError("invalid_header")
        if name.lower() in _BLOCKED or "\r" in text or "\n" in text or len(text.encode("utf-8")) > 8192:
            raise ValueError("invalid_header")
        result[name] = text
    return result
