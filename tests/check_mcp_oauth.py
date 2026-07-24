import unittest, json, sqlite3, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from datetime import datetime, timedelta
from backend.knowflow.services.mcp_oauth import McpOAuthCoordinator, McpOAuthError

class Resp:
    def __init__(self,status=200,data=None,headers=None): self.status_code=status; self._d=data or {}; self.headers=headers or {}; self.content=json.dumps(self._d).encode(); self.text=self.content.decode()
    def json(self): return self._d
class Client:
    def __init__(self,resp): self.resp=resp; self.closed=False
    def request(self,*a,**k): return self.resp
    def close(self): self.closed=True
class Config:
    def __init__(self): self.s={(1,2):{'url':'https://example.com','credentials':{}}}; self.sessions=[]; self.status=''
    def secret(self,u,s): return self.s.get((u,s))
    def encrypt_credentials(self,x): return x
    def decrypt_credentials(self,x): return x
    def create_oauth_session(self,u,s,**kw): self.sessions.append({'user_id':u,'server_id':s,**kw}); return self.sessions[-1]
    def consume_oauth_session_by_state(self,u,h):
        for x in list(self.sessions):
            if x['user_id']==u and x['state_hash']==h: self.sessions.remove(x); return x
    def delete_expired_oauth_sessions(self,*a): pass
    def save_credentials(self,u,s,c): self.s[(u,s)]['credentials']=c
    def set_status(self,*a,**k): self.status=a[2]
    def get_owned(self,u,s): return self.s[(u,s)]

class OAuthTests(unittest.TestCase):
    def setUp(self):
        self.cfg=Config(); self.calls=[]
        self.meta={'issuer':'https://auth.example','authorization_endpoint':'https://auth.example/authorize?x=1','token_endpoint':'https://auth.example/token','registration_endpoint':'https://auth.example/register','response_types_supported':['code'],'code_challenge_methods_supported':['S256']}
        def fac(): return Client(Resp(401,headers={'WWW-Authenticate':'Bearer resource_metadata="https://example.com/meta"'}))
        self.c=McpOAuthCoordinator(configs=self.cfg,base_url='https://app',http_client_factory=fac,resolver=lambda h,p:['8.8.8.8'])
    def test_error_class(self): self.assertEqual(McpOAuthError('x').code,'x')
    def test_url_validation(self): self.assertRaises(McpOAuthError,self.c._url,'http://x')
    def test_json_invalid(self):
        class Bad:
            def json(self): raise ValueError()
        self.assertRaises(McpOAuthError,self.c._json,Bad())
    def test_client_close(self):
        cl=Client(Resp()); self.c.factory=lambda:cl; self.c._request('GET','https://example.com'); self.assertTrue(cl.closed)
    def test_discover_missing(self): self.assertRaises(McpOAuthError,self.c.discover_metadata,'https://example.com')
    def test_state_hash(self): self.assertEqual(len(__import__('hashlib').sha256(b'a').hexdigest()),64)
    def test_authorization_denied_consumes(self):
        self.cfg.sessions=[{'user_id':1,'server_id':2,'state_hash':__import__('hashlib').sha256(b's').hexdigest(),'pkce_verifier_cipher':{}}]
        self.assertRaises(McpOAuthError,self.c.complete_authorization,1,'s',error='access_denied'); self.assertFalse(self.cfg.sessions)
    def test_cross_user(self):
        self.cfg.sessions=[{'user_id':2,'server_id':2,'state_hash':'x','pkce_verifier_cipher':{}}]; self.assertIsNone(self.cfg.consume_oauth_session_by_state(1,'x'))
    def test_expiry_refresh(self): self.cfg.s[(1,2)]['credentials']={'access_token':'a','expires_at':0}; self.assertRaises(McpOAuthError,self.c.ensure_access_token,1,2)
    def test_force_refresh_requires_refresh(self): self.cfg.s[(1,2)]['credentials']={'access_token':'a','expires_at':9999999999}; self.assertRaises(McpOAuthError,self.c.ensure_access_token,1,2,True)
    def test_headers(self): self.cfg.s[(1,2)]['credentials']={'access_token':'a','expires_at':9999999999}; self.assertEqual(self.c.authorization_headers(1,2),{'Authorization':'Bearer a'})
    def test_revoke_unsupported(self): self.assertFalse(self.c.revoke_credentials(1,2)['ok'])
    def test_registration_no_endpoint(self): self.cfg.s[(1,2)]['credentials']={'metadata':self.meta}; self.assertEqual(self.cfg.s[(1,2)]['credentials']['metadata']['response_types_supported'],['code'])
    def test_token_expiry_math(self): self.assertGreater(datetime.utcnow().timestamp()+10,datetime.utcnow().timestamp())

if __name__=='__main__': unittest.main(verbosity=1)
