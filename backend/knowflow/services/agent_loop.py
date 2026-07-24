from __future__ import annotations
from dataclasses import dataclass
import json, time
from typing import Any, Callable
from pydantic import BaseModel, ValidationError
from .agent_trace import AgentTraceRecorder

@dataclass
class ToolDefinition:
    name: str; description: str; handler: Callable[[Any], Any]
    arguments_model: type[BaseModel] | None = None
    input_schema: dict[str, Any] | None = None
    read_only: bool = True
    trace_kind: str = "tool"
    risk: str = "read"
    server_name: str | None = None
    def __post_init__(self):
        if (self.arguments_model is None) == (self.input_schema is None):
            raise ValueError("exactly one of arguments_model or input_schema is required")
        if self.input_schema is not None:
            try:
                from jsonschema import Draft202012Validator
                Draft202012Validator.check_schema(self.input_schema)
            except Exception as exc:
                raise ValueError("invalid input schema") from exc

@dataclass
class ToolExecution:
    call_id: str; tool_name: str; arguments: dict[str, Any]; output: dict[str, Any]; status: str
    error_code: str | None; error_message: str | None; latency_ms: int
    def model_content(self) -> str:
        return json.dumps({"ok": self.status == "success", "result": self.output if self.status == "success" else None,
            "error": ({"code": self.error_code, "message": self.error_message} if self.status != "success" else None)}, ensure_ascii=False)

@dataclass
class PreparedToolCall:
    definition: ToolDefinition | None; call_id: str; tool_name: str; arguments: dict[str, Any]; error: ToolExecution | None = None

@dataclass
class AgentRunResult:
    answer: str; executions: list[ToolExecution]; trace: list[dict[str, Any]]
class AgentLoopLimitError(RuntimeError): pass

class ToolRegistry:
    def __init__(self): self._definitions: dict[str, ToolDefinition] = {}
    def register(self, *, name: str, description: str, handler: Callable[[Any], Any], read_only: bool = True,
                 arguments_model: type[BaseModel] | None = None, input_schema: dict[str, Any] | None = None,
                 trace_kind: str = "tool", risk: str = "read", server_name: str | None = None) -> None:
        self._definitions[name] = ToolDefinition(name=name, description=description, handler=handler,
            arguments_model=arguments_model, input_schema=input_schema, read_only=read_only,
            trace_kind=trace_kind, risk=risk, server_name=server_name)
    def schemas(self):
        out=[]
        for d in self._definitions.values():
            params = d.arguments_model.model_json_schema() if d.arguments_model else d.input_schema
            out.append({"type":"function","function":{"name":d.name,"description":d.description,"parameters":params}})
        return out
    def prepare(self, tool_call: dict[str, Any]) -> PreparedToolCall:
        fn = tool_call.get("function") or {}; cid=str(tool_call.get("id") or ""); name=str(fn.get("name") or "")
        d=self._definitions.get(name); started=time.perf_counter()
        if not d: return PreparedToolCall(None,cid,name or "unknown",{},self._failure(cid,name or "unknown",{},"unknown_tool","The requested tool is not registered.",started))
        try:
            raw=fn.get("arguments") or "{}"; args=json.loads(raw) if isinstance(raw,str) else raw
            if not isinstance(args,dict): raise ValueError
            if d.arguments_model: validated=d.arguments_model.model_validate(args); normalized=validated.model_dump()
            else:
                from jsonschema import validate
                validate(instance=args, schema=d.input_schema); normalized=args
            return PreparedToolCall(d,cid,name,normalized)
        except Exception:
            return PreparedToolCall(d,cid,name,{},self._failure(cid,name,{},"invalid_arguments","Invalid tool arguments.",started))
    def invoke(self, prepared: PreparedToolCall) -> ToolExecution:
        if prepared.error: return prepared.error
        started=time.perf_counter(); d=prepared.definition
        try:
            raw=d.handler(prepared.arguments if d.arguments_model is None else d.arguments_model.model_validate(prepared.arguments))
            return ToolExecution(prepared.call_id,prepared.tool_name,prepared.arguments,raw if isinstance(raw,dict) else {"value":raw},"success",None,None,int((time.perf_counter()-started)*1000))
        except Exception as exc: return self._failure(prepared.call_id,prepared.tool_name,prepared.arguments,str(getattr(exc,"code","") or "tool_execution_failed"),str(exc) or "Tool execution failed.",started)
    def execute(self, tool_call): return self.invoke(self.prepare(tool_call))
    @staticmethod
    def _failure(call_id,tool_name,arguments,error_code,error_message,started_at):
        return ToolExecution(call_id,tool_name,arguments,{},"failed",error_code,error_message,int((time.perf_counter()-started_at)*1000))

class AgentRunner:
    def __init__(self, *, gateway, max_tool_rounds=3): self.gateway=gateway; self.max_tool_rounds=max(0,max_tool_rounds)
    def run(self, *, messages, config, registry, trace=None, parent_step_id=None):
        working=[dict(m) for m in messages]; executions=[]; schemas=registry.schemas()
        for tool_round in range(self.max_tool_rounds+1):
            ms=trace.start_step(kind="model",name="model_completion",title="Model is analyzing",parent_id=parent_step_id,input_summary={"messageCount":len(working),"toolCount":len(schemas)}) if trace else None
            message=self.gateway.complete(working,config,tools=schemas or None,tool_choice="auto" if schemas else None); calls=message.get("tool_calls") or []; answer=str(message.get("content") or "").strip()
            if trace and ms: trace.finish_step(ms,status="success" if calls or answer else "failed",title="Model selected a tool" if calls else "Model generated an answer",output_summary={"toolCallCount":len(calls)})
            if not calls:
                if not answer: raise ValueError("Model returned neither text nor tool calls.")
                return AgentRunResult(answer,executions,trace.snapshot() if trace else [])
            if tool_round>=self.max_tool_rounds: raise AgentLoopLimitError("Agent exceeded the maximum tool-call rounds.")
            working.append({"role":"assistant","content":message.get("content"),"tool_calls":calls})
            for call in calls:
                prepared=registry.prepare(call); executions.append(registry.invoke(prepared)); ex=executions[-1]; d=prepared.definition
                if trace:
                    trace.finish_step(trace.start_step(kind=d.trace_kind if d else "tool",name=prepared.tool_name,title=f"Running {prepared.tool_name}",parent_id=parent_step_id,input_summary=(call.get("function") or {}).get("arguments")),status="success" if ex.status=="success" else "failed",title=f"{prepared.tool_name} completed" if ex.status=="success" else f"{prepared.tool_name} failed",output_summary=ex.output if ex.status=="success" else ex.error_message,error_code=None if ex.status=="success" else ex.error_code)
                working.append({"role":"tool","tool_call_id":ex.call_id,"name":ex.tool_name,"content":ex.model_content()})
