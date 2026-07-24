from __future__ import annotations

from typing import Any


SUPPORTED_TOOL_PROVIDERS = {"web_search": "tavily"}


class ToolConfigService:
    def __init__(self, *, fetch_one, fetch_all, execute, cipher, now_str):
        self.fetch_one = fetch_one
        self.fetch_all = fetch_all
        self.execute = execute
        self.cipher = cipher
        self.now_str = now_str

    def _row(self, user_id: int, tool_name: str) -> dict[str, Any] | None:
        return self.fetch_one(
            "SELECT * FROM tool_config WHERE user_id=:user_id AND tool_name=:tool_name",
            {"user_id": user_id, "tool_name": tool_name},
        )

    def normalize(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "toolName": row["tool_name"],
            "provider": row["provider"],
            "apiKeyMasked": self.cipher.mask(row.get("api_key_cipher")),
            "configured": bool(self.cipher.decrypt(row.get("api_key_cipher"))),
            "enabled": bool(row["enabled"]),
            "createdAt": str(row["created_at"]),
            "updatedAt": str(row["updated_at"]),
        }

    def list_for_user(self, user_id: int) -> list[dict[str, Any]]:
        rows = self.fetch_all(
            "SELECT * FROM tool_config WHERE user_id=:user_id ORDER BY tool_name",
            {"user_id": user_id},
        )
        return [self.normalize(row) for row in rows]

    def upsert(
        self,
        user_id: int,
        tool_name: str,
        *,
        enabled: bool,
        api_key: str | None,
    ) -> dict[str, Any]:
        provider = SUPPORTED_TOOL_PROVIDERS.get(tool_name)
        if not provider:
            raise KeyError(tool_name)
        row = self._row(user_id, tool_name)
        new_key = (api_key or "").strip()
        existing_cipher = row.get("api_key_cipher") if row else ""
        api_key_cipher = self.cipher.encrypt(new_key) if new_key else existing_cipher
        if enabled and not self.cipher.decrypt(api_key_cipher):
            raise ValueError("An API key is required before enabling this tool.")
        now = self.now_str()
        if row:
            self.execute(
                """
                UPDATE tool_config
                SET provider=:provider, api_key_cipher=:api_key_cipher,
                    enabled=:enabled, updated_at=:updated_at
                WHERE user_id=:user_id AND tool_name=:tool_name
                """,
                {
                    "provider": provider,
                    "api_key_cipher": api_key_cipher,
                    "enabled": int(enabled),
                    "updated_at": now,
                    "user_id": user_id,
                    "tool_name": tool_name,
                },
            )
        else:
            self.execute(
                """
                INSERT INTO tool_config(
                  user_id, tool_name, provider, api_key_cipher,
                  enabled, created_at, updated_at
                )
                VALUES (
                  :user_id, :tool_name, :provider, :api_key_cipher,
                  :enabled, :created_at, :updated_at
                )
                """,
                {
                    "user_id": user_id,
                    "tool_name": tool_name,
                    "provider": provider,
                    "api_key_cipher": api_key_cipher,
                    "enabled": int(enabled),
                    "created_at": now,
                    "updated_at": now,
                },
            )
        saved = self._row(user_id, tool_name)
        if not saved:
            raise RuntimeError("Tool configuration could not be saved.")
        return self.normalize(saved)

    def secret(
        self,
        user_id: int,
        tool_name: str,
        *,
        require_enabled: bool,
    ) -> dict[str, Any] | None:
        row = self._row(user_id, tool_name)
        if not row or (require_enabled and not bool(row["enabled"])):
            return None
        api_key = self.cipher.decrypt(row.get("api_key_cipher"))
        if not api_key:
            return None
        return {**row, "api_key": api_key}

    def delete(self, user_id: int, tool_name: str) -> None:
        self.execute(
            "DELETE FROM tool_config WHERE user_id=:user_id AND tool_name=:tool_name",
            {"user_id": user_id, "tool_name": tool_name},
        )
