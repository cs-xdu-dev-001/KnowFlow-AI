from __future__ import annotations
import base64, hashlib, json, secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode, urljoin, urlsplit
from .mcp_security import validate_remote_url

class McpOAuthError(Exception):
    def __init__(self, code, message=None): self.code=code; super().__init__(message or code)

class McpOAuthCoordinator:
    def __init__(self, *, configs, base_url, http_client_factory=None, now=None, resolver=None, allow_private=False, timeout=10, max_bytes=1_000_000):
        self.configs=configs; self.base_url=base_url.rstrip('/'); self.factory=http_client_factory; self.now=now or datetime.utcnow; self.resolver=resolver; self.allow_private=allow_private; self.timeout=timeout; self.max_bytes=max_bytes
    def _url(self,u):
        try:return validate_remote_url(u,resolver=self.resolver,allow_private=self.allow_private)
        except Exception as e: raise McpOAuthError('invalid_remote_url') from e
    def _client(self):
        if self.factory: return self.factory()
        import httpx
        return httpx.Client(trust_env=False,follow_redirects=False,timeout=self.timeout)
    def _request(self, method, url, **kw):
        self._url(url)
        c=self._client(); r=c.request(method,url,timeout=self.timeout,**kw)
        if 300 <= r.status_code < 400: raise McpOAuthError('redirect_rejected')
        content=getattr(r,'content',b'')
        if len(content)>self.max_bytes: raise McpOAuthError('response_too_large')
        return r
    @staticmethod
    def _json(r):
        try:return r.json()
        except Exception as e: raise McpOAuthError('invalid_response') from e
    def discover_metadata(self, resource_url):
        resource_url=self._url(resource_url); r=self._request('GET',resource_url,headers={'Accept':'application/json'})
        if r.status_code != 401: raise McpOAuthError('resource_unauthorized')
        h=getattr(r,'headers',{}); auth=h.get('WWW-Authenticate','')
        marker='resource_metadata='; i=auth.find(marker)
        if i<0: raise McpOAuthError('missing_resource_metadata')
        meta_url=auth[i+len(marker):].split(',',1)[0].strip().strip('"')
        meta_url=self._url(meta_url); rm=self._json(self._request('GET',meta_url)); servers=rm.get('authorization_servers') or []
        if not servers: raise McpOAuthError('missing_authorization_server')
        issuer=self._url(servers[0].rstrip('/')); p=urlsplit(issuer); well=f'{p.scheme}://{p.netloc}/.well-known/oauth-authorization-server{p.path}'
        am=self._json(self._request('GET',well));
        if am.get('issuer','').rstrip('/') != issuer.rstrip('/') or 'code' not in am.get('response_types_supported',['code']) or 'S256' not in am.get('code_challenge_methods_supported',['S256']): raise McpOAuthError('unsupported_authorization_server')
        for k in ('authorization_endpoint','token_endpoint','registration_endpoint','revocation_endpoint'):
            if am.get(k): self._url(am[k])
        return {**rm,**am,'resource':resource_url,'issuer':issuer}
    def start_authorization(self,user_id,server_id,return_to='/'):
        s=self.configs.secret(user_id,server_id)
        if not s: raise McpOAuthError('not_found')
        self.configs.delete_expired_oauth_sessions(user_id)
        md=self.discover_metadata(s['url']); creds=s.get('credentials') or {}; client_id=creds.get('client_id'); client_secret=creds.get('client_secret')
        redirect=f'{self.base_url}/api/mcp/oauth/callback'
        if not client_id:
            reg=self._request('POST',md['registration_endpoint'],json={'client_name':'KnowFlow','redirect_uris':[redirect],'grant_types':['authorization_code'],'response_types':['code']}); data=self._json(reg); client_id=data.get('client_id'); client_secret=data.get('client_secret')
            if not client_id: raise McpOAuthError('registration_failed')
        verifier=secrets.token_urlsafe(64); challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode(); state=secrets.token_urlsafe(32); sh=hashlib.sha256(state.encode()).hexdigest(); exp=(self.now()+timedelta(minutes=10)).isoformat(sep=' ')
        payload={'verifier':verifier,'metadata':md,'client_id':client_id,'client_secret':client_secret}
        self.configs.create_oauth_session(user_id,server_id,state_hash=sh,pkce_verifier_cipher=self.configs.encrypt_credentials(payload),return_to=return_to,expires_at=exp)
        self.configs.save_credentials(user_id,server_id,{**creds,'client_id':client_id,**({'client_secret':client_secret} if client_secret else {}),'metadata':md})
        q={'response_type':'code','client_id':client_id,'redirect_uri':redirect,'code_challenge':challenge,'code_challenge_method':'S256','state':state,'resource':s['url']}
        return {'authorizationUrl':md['authorization_endpoint']+'?'+urlencode(q),'state':state}
    def complete_authorization(self,user_id,state,code=None,error=None):
        row=self.configs.consume_oauth_session_by_state(user_id,hashlib.sha256(state.encode()).hexdigest())
        if not row: raise McpOAuthError('invalid_state')
        if error or not code: raise McpOAuthError('authorization_denied')
        payload=self.configs.decrypt_credentials(row['pkce_verifier_cipher']); md=payload.get('metadata',{}); s=self.configs.secret(user_id,row['server_id']); redirect=f'{self.base_url}/api/mcp/oauth/callback'; form={'grant_type':'authorization_code','code':code,'code_verifier':payload.get('verifier'),'redirect_uri':redirect,'client_id':payload.get('client_id'),'resource':s['url']}
        if payload.get('client_secret'): form['client_secret']=payload['client_secret']
        r=self._request('POST',md['token_endpoint'],data=form); tok=self._json(r); self.configs.save_credentials(user_id,row['server_id'],{**(s.get('credentials') or {}),**tok,'metadata':md}); self.configs.set_status(user_id,row['server_id'],'connected'); return self.configs.get_owned(user_id,row['server_id'])
    def ensure_access_token(self,user_id,server_id,force_refresh=False):
        s=self.configs.secret(user_id,server_id); c=s.get('credentials') if s else None
        if not s or not c: raise McpOAuthError('not_configured')
        exp=c.get('expires_at',0); now=self.now().timestamp() if hasattr(self.now(),'timestamp') else 0
        if c.get('access_token') and not force_refresh and (not exp or float(exp)>now+60): return c['access_token']
        if not c.get('refresh_token'): raise McpOAuthError('reauthorize')
        md=c.get('metadata') or {}; form={'grant_type':'refresh_token','refresh_token':c['refresh_token'],'client_id':c.get('client_id'),'resource':s['url']}
        if c.get('client_secret'): form['client_secret']=c['client_secret']
        r=self._request('POST',md['token_endpoint'],data=form)
        if r.status_code>=400:
            if 'invalid_grant' in str(getattr(r,'text','')): self.configs.set_status(user_id,server_id,'reauthorize',error_code='invalid_grant'); raise McpOAuthError('reauthorize')
            raise McpOAuthError('token_refresh_failed')
        tok=self._json(r); self.configs.save_credentials(user_id,server_id,{**c,**tok,**({'refresh_token':c['refresh_token']} if not tok.get('refresh_token') else {})}); return tok.get('access_token')
    def authorization_headers(self,user_id,server_id,force_refresh=False): return {'Authorization':'Bearer '+self.ensure_access_token(user_id,server_id,force_refresh)}
    def revoke_credentials(self,user_id,server_id):
        s=self.configs.secret(user_id,server_id); c=(s or {}).get('credentials') or {}; ep=(c.get('metadata') or {}).get('revocation_endpoint')
        if not ep:return {'ok':False,'code':'unsupported'}
        try:self._request('POST',ep,data={'token':c.get('refresh_token') or c.get('access_token'),'client_id':c.get('client_id')}); return {'ok':True}
        except McpOAuthError as e:return {'ok':False,'code':e.code}
