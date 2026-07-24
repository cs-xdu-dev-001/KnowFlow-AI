"""Defensive MCP remote client adapter."""
from __future__ import annotations
import asyncio, hashlib, json, re
from contextlib import AsyncExitStack
from datetime import timedelta
from typing import Any, Callable
import httpx
try:
 from mcp import ClientSession
 from mcp.client.streamable_http import streamable_http_client
except Exception:
 ClientSession = None; streamable_http_client = None
from .mcp_security import validate_remote_url, validate_static_headers

MCP_MAX_RESPONSE_BYTES = 256*1024
class McpClientError(Exception):
 def __init__(self,message,code="mcp_client_error"): super().__init__(message); self.code=code
def _get(x,k,d=None): return x.get(k,d) if isinstance(x,dict) else getattr(x,k,d)
def _size(x): return len(json.dumps(x,ensure_ascii=False,separators=(",",":"),default=str).encode())
def _slug(x,fallback="server"):
 s=re.sub(r"[^A-Za-z0-9_-]+","-",str(x or "")).strip("-") or fallback
 return s
def model_tool_name(server,tool):
 raw=f"mcp__{_slug(server)}__{_slug(tool)}"
 return raw if len(raw)<=64 else raw[:55]+"-"+hashlib.sha256(raw.encode()).hexdigest()[:8]
def normalize_result(result,max_chars=4000,max_response_bytes=MCP_MAX_RESPONSE_BYTES):
 text=[]; types=[]
 for b in (_get(result,"content",[]) or []):
  typ=_get(b,"type")
  if typ=="text": text.append(str(_get(b,"text", "")))
  elif typ: types.append({"type":str(typ)})
 out={"structuredContent":_get(result,"structuredContent") if isinstance(_get(result,"structuredContent"),(dict,list)) else None,"content":"".join(text),"isError":bool(_get(result,"isError",False))}
 if types: out["contentTypes"]=types
 if _size(out)>max_response_bytes: raise McpClientError("mcp_response_too_large","mcp_response_too_large")
 out["content"]=out["content"][:max_chars]; return out

class _Conn:
 def __init__(self,s,stack,http): self.session,self.stack,self.http=s,stack,http
class McpRemoteClient:
 def __init__(self,server_id,server_url,headers=None,server_name=None,session_factory=None,max_response_bytes=None,resolver=None,allow_private=False,connect_timeout=10,request_timeout=30):
  self.server_id=server_id; self.server_url=server_url; self.server_name=server_name or server_id; self.headers=validate_static_headers(headers or {}); self.session_factory=session_factory; self.max_response_bytes=max_response_bytes or MCP_MAX_RESPONSE_BYTES; self.resolver=resolver; self.allow_private=allow_private; self.connect_timeout=connect_timeout; self.request_timeout=request_timeout; self.tool_snapshot={}
 async def _connect(self):
  validate_remote_url(self.server_url,resolver=self.resolver,allow_private=self.allow_private)
  timeout=httpx.Timeout(self.request_timeout,connect=self.connect_timeout)
  http=httpx.AsyncClient(headers=self.headers,trust_env=False,follow_redirects=False,timeout=timeout)
  stack=AsyncExitStack(); await stack.__aenter__()
  try:
   if self.session_factory:
    s=await self.session_factory(self.server_url,self.headers)
   else:
    if not ClientSession: raise McpClientError("mcp_sdk_unavailable")
    transport=await stack.enter_async_context(streamable_http_client(self.server_url,http_client=http))
    s=await stack.enter_async_context(ClientSession(transport[0],transport[1],read_timeout_seconds=timedelta(seconds=self.request_timeout)))
   await s.initialize(); return _Conn(s,stack,http)
  except Exception:
   await stack.aclose(); await http.aclose(); raise
 async def discover_tools(self):
  c=await self._connect()
  try:
   all_tools=[]; cursor=None; seen_c=set()
   while True:
    r=await c.session.list_tools(cursor=cursor) if cursor is not None else await c.session.list_tools()
    all_tools.extend(_get(r,"tools",[]) or []); cursor=_get(r,"nextCursor")
    if not cursor or cursor in seen_c: break
    seen_c.add(cursor)
   snap={}
   for t in all_tools:
    remote=str(_get(t,"name", "")); model=model_tool_name(self.server_name,remote)
    if model in snap: raise McpClientError("tool_name_conflict","tool_name_conflict")
    schema=_get(t,"inputSchema",{})
    if not isinstance(schema,dict): raise McpClientError("invalid_input_schema","invalid_input_schema")
    item={"modelName":model,"remoteName":remote,"serverId":self.server_id,"serverName":self.server_name,"description":str(_get(t,"description","") or "")[:1000],"inputSchema":schema}
    ann=_get(t,"annotations")
    if ann is not None: item["annotations"]={k:_get(ann,k) for k in ("title","readOnlyHint","destructiveHint","idempotentHint","openWorldHint") if _get(ann,k) is not None}
    snap[model]=item
   if _size(snap)>self.max_response_bytes: raise McpClientError("mcp_response_too_large","mcp_response_too_large")
   self.tool_snapshot=snap; return list(snap.values())
  finally: await c.stack.aclose(); await c.http.aclose()

class McpRunSessionPool:
 def __init__(self,max_chars=4000,server_loader=None,**kwargs): self.max_chars=max_chars; self.server_loader=server_loader; self.kwargs=kwargs; self._sessions={}; self._clients={}; self._loop=asyncio.new_event_loop()
 def __enter__(self): return self
 def __exit__(self,*exc): self.close()
 def call_tool(self,server_id,remote_name,arguments=None): return self._loop.run_until_complete(self._call(server_id,remote_name,arguments or {}))
 async def _call(self,sid,remote,args):
  if sid not in self._sessions:
   client=self.server_loader(sid) if self.server_loader else sid
   self._clients[sid]=client; self._sessions[sid]=await client._connect()
  r=await self._sessions[sid].session.call_tool(remote,args); return normalize_result(r,self.max_chars,self._clients[sid].max_response_bytes)
 def close(self):
  if not self._loop.is_closed(): self._loop.run_until_complete(self._aclose()); self._loop.close()
 async def _aclose(self):
  for c in self._sessions.values(): await c.stack.aclose(); await c.http.aclose()
  self._sessions.clear(); self._clients.clear()
