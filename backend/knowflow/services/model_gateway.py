from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException


class ModelGateway:
    def __init__(self, *, fetch_one, cipher, post_model_json, local_embedding):
        self.fetch_one = fetch_one
        self.cipher = cipher
        self.post_model_json = post_model_json
        self.local_embedding = local_embedding

    def get_config(self, config_id: int | None, model_type: str, user_id: int | None = None) -> dict[str, Any] | None:
        if config_id:
            if user_id is None:
                row = self.fetch_one("SELECT * FROM model_config WHERE id=:id AND model_type=:model_type", {"id": config_id, "model_type": model_type})
            else:
                row = self.fetch_one(
                    "SELECT * FROM model_config WHERE id=:id AND model_type=:model_type AND user_id=:user_id",
                    {"id": config_id, "model_type": model_type, "user_id": user_id},
                )
            if row:
                return row
            if user_id is not None:
                raise HTTPException(status_code=404, detail="模型配置不存在")
        if user_id is not None:
            return self.fetch_one(
                "SELECT * FROM model_config WHERE model_type=:model_type AND is_default=1 AND user_id=:user_id ORDER BY id DESC LIMIT 1",
                {"model_type": model_type, "user_id": user_id},
            )
        return self.fetch_one(
            "SELECT * FROM model_config WHERE model_type=:model_type AND is_default=1 ORDER BY id DESC LIMIT 1",
            {"model_type": model_type},
        )

    def test(self, config: dict[str, Any]) -> tuple[str, str]:
        model_type = config["model_type"]
        try:
            if model_type == "embedding":
                vector = self.embed("ping", config)
                if vector:
                    return "available", f"连接成功，返回 {len(vector)} 维向量"
            else:
                answer = self.chat([{"role": "user", "content": "ping"}], config)
                if answer:
                    return "available", "连接成功，模型返回正常"
        except Exception as exc:
            return "unavailable", str(exc)
        return "unavailable", "模型未返回有效结果"

    def endpoint(self, base_url: str, path: str) -> str:
        base = base_url.rstrip("/")
        if base.endswith(path):
            return base
        return base + path

    def headers(self, config: dict[str, Any]) -> dict[str, str]:
        key = self.cipher.decrypt(config.get("api_key_cipher"))
        headers = {"Content-Type": "application/json"}
        if key:
            if config.get("provider") == "mimo":
                headers["api-key"] = key
            else:
                headers["Authorization"] = f"Bearer {key}"
        return headers

    def embed(self, text_value: str, config: dict[str, Any] | None = None) -> list[float]:
        if not config or not self.cipher.decrypt(config.get("api_key_cipher")):
            return self.local_embedding(text_value)
        url = self.endpoint(config["base_url"], "/embeddings")
        payload = {"model": config["model_name"], "input": text_value}
        response = self.post_model_json(url, self.headers(config), payload)
        response.raise_for_status()
        data = response.json()
        return list(data["data"][0]["embedding"])

    def chat(self, messages: list[dict[str, str]], config: dict[str, Any] | None = None) -> str:
        if not config or not self.cipher.decrypt(config.get("api_key_cipher")):
            return self.local_answer(messages)
        url = self.endpoint(config["base_url"], "/chat/completions")
        payload: dict[str, Any] = {
            "model": config["model_name"],
            "messages": messages,
            "temperature": config.get("temperature") if config.get("temperature") is not None else 0.3,
        }
        if config.get("top_p") is not None:
            payload["top_p"] = float(config["top_p"])
        if config.get("max_tokens") is not None:
            if config.get("provider") == "mimo":
                payload["max_completion_tokens"] = int(config["max_tokens"])
            else:
                payload["max_tokens"] = int(config["max_tokens"])
        response = self.post_model_json(url, self.headers(config), payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    def local_answer(self, messages: list[dict[str, str]]) -> str:
        system_content = next((item["content"] for item in messages if item["role"] == "system"), "")
        user_content = next((item["content"] for item in reversed(messages) if item["role"] == "user"), "")
        if any(keyword in user_content for keyword in ["什么模型", "供应商", "你是谁", "身份", "model", "provider"]):
            match = re.search(r"当前模型配置：([^。]+)", system_content)
            identity = match.group(1) if match else "local fallback / no remote provider configured"
            return f"当前选择的模型配置是：{identity}。KnowFlow AI 只是外层应用入口。"
        return "本地 fallback 模型已接收问题：" + user_content

