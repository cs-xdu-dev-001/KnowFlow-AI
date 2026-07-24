from __future__ import annotations
import base64, hashlib, json, secrets, ipaddress, socket
from datetime import datetime, timedelta
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl
from .mcp_security import validate_remote_url, resolve_remote_addresses

class McpOAuthError(Exception):
    def __init__(self, code, message=None): self.code=code; super().__init__(message or code)

class _PinnedSyncTransport:
    def __init__(self, resolver=None, allow_private=False):
        import httpx; self.resolver=resolver; self.allow_private=allow_private; self.inner=httpx.HTTPTransport()
    def handle_request(self, request):
        import httpx
        host=request.url.host; port=request.url.port or (443 if request.url.scheme=='https' else 80)
        ips=resolve_remote_addresses(host,port,self.resolver,self.allow_private)
        u=httpx.URL(str(request.url)).copy_with(host=ips[0])
        request.url=u; request.headers['host']=host if not request.url.port else f'{host}:{port}'
        request.extensions['sni_hostname']=host
        return self.inner.handle_request(request)
    def close(self): self.inner.close()

class McpOAuthCoordinator:
    def __init__(self, *, configs, base_url, http_client_factory=None, now=None, resolver=None, allow_private=False, timeout=10, max_bytes=1_000_000):
        self.configs=configs; self.base_url=base_url.rstrip('/'); self.factory=http_client_factory; self.now=now or datetime.utcnow; self.resolver=resolver; self.allow_private=allow_private; self.timeout=timeout; self.max_bytes=max_bytes
    def _url(self,u):
        try:return validate_remote_url(u,resolver=self.resolver,allow_private=self.allow_private)
        except Exception as e: raise McpOAuthError('invalid_remote_url') from e
    def _client(self):
        if self.factory:return self.factory()
        import httpx
        return httpx.Client(trust_env=False,follow_redirects=False,timeout=self.timeout,transport=_PinnedSyncTransport(self.resolver,self.allow_private))
    def _request(self,method,url,**kw):
        self._url(url); c=self._client()
        try:
            r=c.request(method,url,timeout=self.timeout,**kw); content=getattr(r,'content',b'')
            if 300<=r.status_code<400: raise McpOAuthError('redirect_rejected')
            if len(content)>self.max_bytes: raise McpOAuthError('response_too_large')
            return r
        finally:
            try:c.close()
            except Exception: pass
    @staticmethod
    def _json(r):
        try:return r.json()
        except Exception as e: raise McpOAuthError('invalid_response') from e
    def discover_metadata(self,resource_url):
        resource_url=self._url(resource_url); r=self._request('GET',resource_url,headers={'Accept':'application/json'})
        if r.status_code not in (401,): raise McpOAuthError('resource_unauthorized')
        auth=r.headers.get('WWW-Authenticate',''); import re
        m=re.search(r'resource_metadata\s*=\s*"?([^",\s]+)',auth,re.I)
        if not m: raise McpOAuthError('missing_resource_metadata')
        rm=self._json(self._request('GET',m.group(1))); servers=rm.get('authorization_servers') or []
        if not servers: raise McpOAuthError('missing_authorization_server')
        issuer=self._url(servers[0]).rstrip('/'); p=urlsplit(issuer); path=p.path.rstrip('/')
        well=f'{p.scheme}://{p.netloc}/.well-known/oauth-authorization-server{path}'
        am=self._json(self._request('GET',well))
        if self._url(am.get('issuer','')).rstrip('/')!=issuer or 'code' not in am.get('response_types_supported',[]) or 'S256' not in am.get('code_challenge_methods_supported',[]): raise McpOAuthError('unsupported_authorization_server')
        for k in ('authorization_endpoint','token_endpoint','registration_endpoint','revocation_endpoint'):
            if am.get(k): self._url(am[k])
        if not am.get('authorization_endpoint') or not am.get('token_endpoint'): raise McpOAuthError('unsupported_authorization_server')
        return {**rm,**am,'resource':resource_url,'issuer':issuer}
    def start_authorization(self,user_id,server_id,return_to='/'):
        s=self.configs.secret(user_id,server_id); creds=(s or {}).get('credentials') or {}
        if not s: raise McpOAuthError('not_found')
        md=self.discover_metadata(s['url']); cid=creds.get('client_id'); cs=creds.get('client_secret'); redirect=f'{self.base_url}/api/mcp/oauth/callback'
        if not cid:
            if not md.get('registration_endpoint'): raise McpOAuthError('registration_unavailable')
            d=self._json(self._request('POST',md['registration_endpoint'],json={'client_name':'KnowFlow','redirect_uris':[redirect],'grant_types':['authorization_code'],'response_types':['code']}))
            if not d.get('client_id'): raise McpOAuthError('registration_failed')
            cid,cs=d.get('client_id'),d.get('client_secret')
        verifier=secrets.token_urlsafe(64); challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode(); state=secrets.token_urlsafe(32); sh=hashlib.sha256(state.encode()).hexdigest(); exp=(self.now()+timedelta(minutes=10)).isoformat(sep=' ')
        payload={'verifier':verifier,'metadata':md,'client_id':cid,'client_secret':cs}; self.configs.create_oauth_session(user_id,server_id,state_hash=sh,pkce_verifier_cipher=self.configs.encrypt_credentials(payload),return_to=return_to,expires_at=exp); self.configs.save_credentials(user_id,server_id,{**creds,'client_id':cid,**({'client_secret':cs} if cs else {}),'metadata':md})
        q=dict(parse_qsl(urlsplit(md['authorization_endpoint']).query)); q.update(response_type='code',client_id=cid,redirect_uri=redirect,code_challenge=challenge,code_challenge_method='S256',state=state,resource=s['url']); u=urlsplit(md['authorization_endpoint']); return {'authorizationUrl':urlunsplit((u.scheme,u.netloc,u.path,urlencode(q),u.fragment)),'state':state}
    def complete_authorization(self,user_id,state,code=None,error=None):
        row=self.configs.consume_oauth_session_by_state(user_id,hashlib.sha256(state.encode()).hexdigest())
        if not row: raise McpOAuthError('invalid_state')
        if error or not code: raise McpOAuthError('authorization_denied')
        p=self.configs.decrypt_credentials(row['pkce_verifier_cipher']); s=self.configs.secret(user_id,row['server_id']); md=p['metadata']; f={'grant_type':'authorization_code','code':code,'code_verifier':p['verifier'],'redirect_uri':f'{self.base_url}/api/mcp/oauth/callback','client_id':p['client_id'],'resource':s['url']};
        if p.get('client_secret'):f['client_secret']=p['client_secret']
        r=self._request('POST',md['token_endpoint'],data=f)
        if not 200<=r.status_code<300: raise McpOAuthError('token_exchange_failed')
        tok=self._json(r)
        if not tok.get('access_token'): raise McpOAuthError('invalid_response')
        if tok.get('expires_in') is not None: tok['expires_at']=self.now().timestamp()+float(tok['expires_in'])
        self.configs.save_credentials(user_id,row['server_id'],{**(s.get('credentials') or {}),**tok,'metadata':md}); self.configs.set_status(user_id,row['server_id'],'connected'); return self.configs.get_owned(user_id,row['server_id'])
    def ensure_access_token(self,user_id,server_id,force_refresh=False):
        if isinstance(server_id,dict): server_id=server_id.get('id') or server_id.get('server_id')
        s=self.configs.secret(user_id,server_id); c=(s or {}).get('credentials') or {}; now=self.now().timestamp()
        if c.get('access_token') and not force_refresh and float(c.get('expires_at',0))>now+60:return c['access_token']
        if not c.get('refresh_token'): raise McpOAuthError('reauthorize')
        md=c.get('metadata') or {}; f={'grant_type':'refresh_token','refresh_token':c['refresh_token'],'client_id':c.get('client_id'),'resource':s['url']};
        if c.get('client_secret'):f['client_secret']=c['client_secret']
        r=self._request('POST',md['token_endpoint'],data=f); d=self._json(r) if r.content else {}
        if not 200<=r.status_code<300:
            if d.get('error')=='invalid_grant': self.configs.set_status(user_id,server_id,'reauthorize',error_code='invalid_grant'); raise McpOAuthError('reauthorize')
            raise McpOAuthError('token_refresh_failed')
        if not d.get('access_token'): raise McpOAuthError('invalid_response')
        if d.get('expires_in') is not None:d['expires_at']=now+float(d['expires_in'])
        self.configs.save_credentials(user_id,server_id,{**c,**d,**({'refresh_token':c['refresh_token']} if not d.get('refresh_token') else {})}); return d['access_token']
    def authorization_headers(self,user_id,server_id,force_refresh=False): return {'Authorization':'Bearer '+self.ensure_access_token(user_id,server_id,force_refresh)}
    def revoke_credentials(self,user_id,server_id):
        s=self.configs.secret(user_id,server_id); c=(s or {}).get('credentials') or {}; ep=(c.get('metadata') or {}).get('revocation_endpoint')
        if not ep:return {'ok':False,'code':'unsupported'}
        try:self._request('POST',ep,data={'token':c.get('refresh_token') or c.get('access_token'),'client_id':c.get('client_id')}); return {'ok':True}
        except Exception as e:return {'ok':False,'code':getattr(e,'code','revoke_failed')}
