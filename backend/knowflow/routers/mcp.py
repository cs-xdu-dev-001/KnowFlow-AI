import asyncio, re
from fastapi import APIRouter, HTTPException, Request
from ..runtime import *
from ..schemas import McpServerIn, McpServerUpdate
from ..services.mcp_security import validate_remote_url, validate_static_headers
from ..services.mcp_client import McpRemoteClient

router=APIRouter(); NOTION_URL="https://mcp.notion.com/mcp"
def uid(r): return current_user_id(r)
def owned(r,i):
    x=mcp_configs.get_owned(uid(r),i)
    if not x: raise HTTPException(404,"MCP server not found")
    return x
def out(x):
    x=dict(x); x.pop("userId",None); return x

@router.get('/api/mcp',tags=['MCP'])
def listing(request:Request): return api_success([out(x) for x in mcp_configs.list_for_user(uid(request))])
@router.get('/api/mcp/{server_id}',tags=['MCP'])
def detail(server_id:int,request:Request): return api_success(out(owned(request,server_id)))
@router.post('/api/mcp',tags=['MCP'])
def create(payload:McpServerIn,request:Request):
    name,slug,url,auth=payload.name,payload.slug,payload.url,payload.authType
    if name.lower()=='notion': name,slug,url,auth='Notion','notion',NOTION_URL,'oauth'
    slug=slug or re.sub(r'[^a-z0-9-]+','-',name.lower()).strip('-')
    try: url=validate_remote_url(url)
    except Exception as e: raise HTTPException(400,str(e))
    if auth=='headers':
      try: validate_static_headers(payload.headers)
      except Exception as e: raise HTTPException(400,str(e))
    try: x=mcp_configs.create_server(uid(request),name=name,slug=slug,url=url,auth_type=auth,enabled=payload.enabled)
    except Exception: raise HTTPException(409,'slug already exists')
    if payload.headers: mcp_configs.save_credentials(uid(request),x['id'],{'headers':payload.headers})
    if payload.enabledTools: mcp_configs.set_enabled_tools(uid(request),x['id'],payload.enabledTools)
    return api_success(out(mcp_configs.get_owned(uid(request),x['id'])))
@router.patch('/api/mcp/{server_id}',tags=['MCP'])
def update(server_id:int,payload:McpServerUpdate,request:Request):
    owned(request,server_id); d=payload.model_dump(exclude_none=True); headers=d.pop('headers',None); en=d.pop('enabledTools',None)
    fields={'name':d.get('name'),'slug':d.get('slug'),'url':d.get('url'),'auth_type':d.get('authType'),'enabled':d.get('enabled')}; mcp_configs.update_server(uid(request),server_id,**{k:v for k,v in fields.items() if v is not None})
    if headers is not None: mcp_configs.save_credentials(uid(request),server_id,{'headers':headers})
    if en is not None: mcp_configs.set_enabled_tools(uid(request),server_id,en)
    return api_success(out(mcp_configs.get_owned(uid(request),server_id)))
@router.delete('/api/mcp/{server_id}',tags=['MCP'])
def delete(server_id:int,request:Request): owned(request,server_id); mcp_configs.delete_server(uid(request),server_id); return api_success(True)
@router.post('/api/mcp/{server_id}/disconnect',tags=['MCP'])
def disconnect(server_id:int,request:Request): owned(request,server_id); mcp_configs.clear_credentials(uid(request),server_id); mcp_configs.update_server(uid(request),server_id,enabled=False); return api_success(mcp_configs.set_status(uid(request),server_id,'disconnected'))
@router.post('/api/mcp/{server_id}/test',tags=['MCP'])
@router.post('/api/mcp/{server_id}/refresh-tools',tags=['MCP'])
def refresh(server_id:int,request:Request):
    s=owned(request,server_id); sec=mcp_configs.secret(uid(request),server_id) or {}; c=sec.get('credentials') or {}; headers=c.get('headers',{}) if s['authType']=='headers' else {}
    try: tools=asyncio.run(McpRemoteClient(str(server_id),s['url'],server_name=s['slug'],headers=headers,request_timeout=MCP_REQUEST_TIMEOUT,max_response_bytes=MCP_MAX_RESPONSE_BYTES,allow_private=MCP_ALLOW_PRIVATE_NETWORKS).discover_tools())
    except Exception as e: mcp_configs.set_status(uid(request),server_id,'error',error_code='mcp_discovery_failed'); raise HTTPException(502,'MCP connection failed')
    return api_success(mcp_configs.save_tool_snapshot(uid(request),server_id,tools))
