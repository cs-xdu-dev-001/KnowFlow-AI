from __future__ import annotations

from dataclasses import dataclass
import json
import time
from typing import Any, Callable

from pydantic import BaseModel, ValidationError


@dataclass
class ToolDefinition:
    name: str
    description: str
    arguments_model: type[BaseModel]
    handler: Callable[[BaseModel], Any]
    read_only: bool


@dataclass
class ToolExecution:
    call_id: str
    tool_name: str
    arguments: dict[str, Any]
    output: dict[str, Any]
    status: str
    error_code: str | None
    error_message: str | None
    latency_ms: int

    def model_content(self) -> str:
        return json.dumps(
            {
                "ok": self.status == "success",
                "result": self.output if self.status == "success" else None,
                "error": (
                    {
                        "code": self.error_code,
                        "message": self.error_message,
                    }
                    if self.status != "success"
                    else None
                ),
            },
            ensure_ascii=False,
        )


@dataclass
class AgentRunResult:
    answer: str
    executions: list[ToolExecution]


class AgentLoopLimitError(RuntimeError):
    pass


class ToolRegistry:
    def __init__(self):
        self._definitions: dict[str, ToolDefinition] = {}

    def register(
        self,
        *,
        name: str,
        description: str,
        arguments_model: type[BaseModel],
        handler: Callable[[BaseModel], Any],
        read_only: bool,
    ) -> None:
        self._definitions[name] = ToolDefinition(
            name=name,
            description=description,
            arguments_model=arguments_model,
            handler=handler,
            read_only=read_only,
        )

    def schemas(self) -> list[dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": definition.name,
                    "description": definition.description,
                    "parameters": definition.arguments_model.model_json_schema(),
                },
            }
            for definition in self._definitions.values()
        ]

    def execute(self, tool_call: dict[str, Any]) -> ToolExecution:
        started_at = time.perf_counter()
        function = tool_call.get("function") or {}
        call_id = str(tool_call.get("id") or "")
        tool_name = str(function.get("name") or "")
        definition = self._definitions.get(tool_name)
        if not definition:
            return self._failure(
                call_id,
                tool_name or "unknown",
                {},
                "unknown_tool",
                "The requested tool is not registered.",
                started_at,
            )
        try:
            raw_arguments = function.get("arguments") or "{}"
            arguments = (
                json.loads(raw_arguments)
                if isinstance(raw_arguments, str)
                else raw_arguments
            )
            if not isinstance(arguments, dict):
                raise ValueError("Tool arguments must be a JSON object.")
            validated = definition.arguments_model.model_validate(arguments)
        except (json.JSONDecodeError, ValidationError, ValueError, TypeError) as exc:
            return self._failure(
                call_id,
                tool_name,
                {},
                "invalid_arguments",
                str(exc),
                started_at,
            )
        try:
            raw_output = definition.handler(validated)
            output = (
                raw_output
                if isinstance(raw_output, dict)
                else {"value": raw_output}
            )
            return ToolExecution(
                call_id=call_id,
                tool_name=tool_name,
                arguments=validated.model_dump(),
                output=output,
                status="success",
                error_code=None,
                error_message=None,
                latency_ms=int((time.perf_counter() - started_at) * 1000),
            )
        except Exception as exc:
            return self._failure(
                call_id,
                tool_name,
                validated.model_dump(),
                str(getattr(exc, "code", "") or "tool_execution_failed"),
                str(exc) or "Tool execution failed.",
                started_at,
            )

    @staticmethod
    def _failure(
        call_id: str,
        tool_name: str,
        arguments: dict[str, Any],
        error_code: str,
        error_message: str,
        started_at: float,
    ) -> ToolExecution:
        return ToolExecution(
            call_id=call_id,
            tool_name=tool_name,
            arguments=arguments,
            output={},
            status="failed",
            error_code=error_code,
            error_message=error_message,
            latency_ms=int((time.perf_counter() - started_at) * 1000),
        )


class AgentRunner:
    def __init__(self, *, gateway, max_tool_rounds: int = 3):
        self.gateway = gateway
        self.max_tool_rounds = max(0, max_tool_rounds)

    def run(
        self,
        *,
        messages: list[dict[str, Any]],
        config: dict[str, Any] | None,
        registry: ToolRegistry,
    ) -> AgentRunResult:
        working_messages = [dict(message) for message in messages]
        executions: list[ToolExecution] = []
        schemas = registry.schemas()
        for tool_round in range(self.max_tool_rounds + 1):
            message = self.gateway.complete(
                working_messages,
                config,
                tools=schemas or None,
                tool_choice="auto" if schemas else None,
            )
            tool_calls = message.get("tool_calls") or []
            if not tool_calls:
                answer = str(message.get("content") or "").strip()
                if not answer:
                    raise ValueError(
                        "Model returned neither text nor tool calls."
                    )
                return AgentRunResult(answer=answer, executions=executions)
            if tool_round >= self.max_tool_rounds:
                raise AgentLoopLimitError(
                    "Agent exceeded the maximum tool-call rounds."
                )
            working_messages.append(
                {
                    "role": "assistant",
                    "content": message.get("content"),
                    "tool_calls": tool_calls,
                }
            )
            for tool_call in tool_calls:
                execution = registry.execute(tool_call)
                executions.append(execution)
                working_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": execution.call_id,
                        "name": execution.tool_name,
                        "content": execution.model_content(),
                    }
                )
        raise AgentLoopLimitError(
            "Agent exceeded the maximum tool-call rounds."
        )
