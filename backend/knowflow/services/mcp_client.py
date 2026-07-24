"""Small, defensive adapter around the official MCP Python SDK."""
from __future__ import annotations
import asyncio, hashlib, json, re
from contextlib import AsyncExitStack
from typing import Any

try:
 from mcp import ClientSession
 from mcp.client.streamable_http import streamable_http_client
except Exception:
 ClientSession = None
 streamable_http_client = None
import httpx
from .mcp_security import validate_remote_url, validate_static_headers

MCP_MAX_RESPONSE_BYTES = 256 * 1024
class McpClientError(Exception):
 def __init__(self, message: str, code: str = "mcp_client_error"):
  super().__init__(message); self.code = code

def _slug(s: Any, fallback="server"):
 s = re.sub(r"[^A-Za-z0-9_-]+", "-", str(s or "")).strip("-") or fallback
 return s
def model_tool_name(server: str, tool: str) -> str:
 a,b=_slug(server),_slug(tool); raw=f"mcp__{a}__{b}"
 if len(raw)<=64:return raw
 digest=hashlib.sha256(raw.encode()).hexdigest()[:8]
 return raw[:64-9]+"-"+digest

def _obj(x, key, default=None):
 if isinstance(x, dict): return x.get(key, default)
 return getattr(x,key,default)
def _json_size(v):
 try:return len(json.dumps(v, ensure_ascii=False, separators=(",",":"), default=str).encode())
 except Exception: raise McpClientError("serialization_failed")

def normalize_result(result, max_chars=4000):
 structured=_obj(result,"structuredContent")
 content=[]; public=[]
 for block in (_obj(result,"content",[]) or []):
  typ=_obj(block,"type")
  if typ=="text": content.append(str(_obj(block,"text", "")))
  elif typ: public.append({"type":str(typ)})
 out={"structuredContent":structured if isinstance(structured,(dict,list)) else None,
      "content":"".join(content)[:max_chars],"isError":bool(_obj(result,"isError",False))}
 if public: out["contentTypes"]=public
 if _json_size(out)>MCP_MAX_RESPONSE_BYTES: raise McpClientError("mcp_response_too_large","mcp_response_too_large")
 return out

class _Session:
 def __init__(self, session, stack, client): self.session,self.stack,self.client=session,stack,client

class McpRemoteClient:
 def __init__(self, server_id, server_url, headers=None, server_name=None, session_factory=None, max_response_bytes=None):
  self.server_id=server_id; self.server_url=server_url; self.headers=validate_static_headers(headers or {}); self.server_name=server_name or server_id
  self.session_factory=session_factory; self.max_response_bytes=max_response_bytes or MCP_MAX_RESPONSE_BYTES; self.tool_snapshot={}
 async def _connect(self):
  validate_remote_url(self.server_url)
  client=httpx.AsyncClient(trust_env=False, follow_redirects=False, timeout=httpx.Timeout(20.0))
  stack=AsyncExitStack(); await stack.__aenter__()
  if self.session_factory: session=await self.session_factory(self.server_url, self.headers)
  else:
   if ClientSession is None: raise McpClientError("mcp_sdk_unavailable")
   transport=await stack.enter_async_context(streamable_http_client(self.server_url, http_client=client, headers=self.headers))
   session=await stack.enter_async_context(ClientSession(transport[0], transport[1]))
  await session.initialize(); return _Session(session,stack,client)
 async def discover_tools(self):
  conn=await self._connect()
  try:
   resp=await conn.session.list_tools(); tools=_obj(resp,"tools",[]) or []; snap={}; seen=set()
   for t in tools:
    remote=_obj(t,"name",""); model=model_tool_name(self.server_name,remote)
    if model in seen or model in snap: raise McpClientError("tool_name_conflict","tool_name_conflict")
    seen.add(model); schema=_obj(t,"inputSchema",{})
    if not isinstance(schema,dict): raise McpClientError("invalid_input_schema","invalid_input_schema")
    item={"modelName":model,"remoteName":remote,"serverId":self.server_id,"name":remote,
      "description":str(_obj(t,"description","") or "")[:1000],"inputSchema":schema}
    ann=_obj(t,"annotations")
    if ann is not None:
     item["annotations"]={k:_obj(ann,k) for k in ("title","readOnlyHint","destructiveHint","idempotentHint","openWorldHint") if _obj(ann,k) is not None}
    snap[model]=item
   if _json_size(snap)>self.max_response_bytes: raise McpClientError("mcp_response_too_large","mcp_response_too_large")
   self.tool_snapshot=snap; return snap
  finally: await conn.stack.aclose(); await conn.client.aclose()

class McpRunSessionPool:
 def __init__(self, max_chars=4000, session_factory=None): self.max_chars=max_chars; self.session_factory=session_factory; self._sessions={}; self._meta={}
 async def call_tool(self, client:McpRemoteClient, model_name, arguments=None):
  sid=client.server_id
  if sid not in self._sessions:
   self._sessions[sid]=await client._connect(); self._meta[sid]=client
  conn=self._sessions[sid]; remote=client.tool_snapshot.get(model_name,{}).get("remoteName",model_name)
  result=await conn.session.call_tool(remote, arguments or {})
  return normalize_result(result,self.max_chars)
 async def aclose(self):
  for c in self._sessions.values(): await c.stack.aclose(); await c.client.aclose()
  self._sessions.clear()
