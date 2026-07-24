import importlib, os, sys
from pathlib import Path
from urllib.parse import quote
from fastapi.testclient import TestClient

ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'data'/'test-dbs'/'mcp-api.db'
def main():
    DB.unlink(missing_ok=True)
    os.environ.update(KNOWFLOW_DB_URL=f'sqlite:///{DB.as_posix()}', KNOWFLOW_SECRET_KEY='mcp-test-secret', KNOWFLOW_BASE_URL='http://127.0.0.1:8010', KNOWFLOW_OAUTH_RETURN_ORIGINS='http://127.0.0.1:5173', KNOWFLOW_VECTOR_STORE='local')
    sys.path.insert(0,str(ROOT/'backend'))
    for n in list(sys.modules):
        if n=='main' or n.startswith('knowflow'): sys.modules.pop(n,None)
    app=importlib.import_module('main').app; c=TestClient(app); bob=TestClient(app)
    for cli,u in ((c,'alice'),(bob,'bob')):
        r=cli.post('/api/auth/register',json={'username':u,'email':u+'@example.com','password':'123456','displayName':u}); assert r.status_code==200,r.text
    notion=c.post('/api/mcp/servers',json={'preset':'notion'}); assert notion.status_code in (200,201),notion.text
    assert notion.json()['data']['url']=='https://mcp.notion.com/mcp' and notion.json()['data']['name']=='Notion'
    created=c.post('/api/mcp/servers',json={'name':'Private','url':'https://example.com/mcp','authType':'headers','headers':{'Authorization':'Bearer SECRET'}}); assert created.status_code in (200,201),created.text
    sid=created.json()['data']['id']; raw=str(created.json()); assert 'SECRET' not in raw and 'credentials_cipher' not in raw.lower()
    assert c.patch(f'/api/mcp/servers/{sid}',json={'headers':{},'clientId':None,'clientSecret':''}).status_code==200
    assert not (router_secret:=importlib.import_module('knowflow.routers.mcp').mcp_configs.secret(1,sid) or {}).get('credentials')
    assert bob.get(f'/api/mcp/servers/{sid}').status_code==404
    assert bob.patch(f'/api/mcp/servers/{sid}',json={'enabled':False}).status_code==404
    assert bob.post(f'/api/mcp/servers/{sid}/test').status_code==404
    assert bob.post(f'/api/mcp/servers/{sid}/refresh-tools').status_code==404
    assert bob.post(f'/api/mcp/servers/{sid}/disconnect').status_code==404
    assert bob.post(f'/api/mcp/servers/{sid}/oauth/start',json={'returnTo':'http://127.0.0.1:5173/'}).status_code==404
    assert bob.delete(f'/api/mcp/servers/{sid}').status_code==404
    router=importlib.import_module('knowflow.routers.mcp'); router.discover=lambda user,s:[{'name':'read','description':'x'},{'name':'write'}]
    ok=c.post(f'/api/mcp/servers/{sid}/refresh-tools'); assert ok.status_code==200,ok.text
    assert c.patch(f'/api/mcp/servers/{sid}',json={'enabledTools':['read']}).status_code==200
    assert c.patch(f'/api/mcp/servers/{sid}',json={'enabledTools':['missing']}).status_code==400
    assert c.patch(f'/api/mcp/servers/{sid}',json={'enabledTools':['t'+str(i) for i in range(65)]}).status_code==400
    router.discover=lambda user,s: (_ for _ in ()).throw(RuntimeError())
    bad=c.post(f'/api/mcp/servers/{sid}/refresh-tools'); assert bad.status_code==502
    assert c.get(f'/api/mcp/servers/{sid}').json()['data']['status']=='error'
    assert c.post('/api/mcp/servers/999999/oauth/start',json={'returnTo':'http://127.0.0.1:5173/'}).status_code==404
    assert TestClient(app).get('/api/mcp/oauth/callback?state=x').status_code==401
    assert c.post(f'/api/mcp/servers/{sid}/oauth/start',json={'returnTo':'https://evil.example/'}).status_code==400
    assert c.delete(f'/api/mcp/servers/{sid}').status_code==200

    oauth=c.post('/api/mcp/servers',json={'name':'OAuth','url':'https://example.com/oauth','authType':'oauth'}); oid=oauth.json()['data']['id']
    router.mcp_oauth.start_authorization=lambda *a: {'authorizationUrl':'https://idp.example/auth'}
    assert c.post(f'/api/mcp/servers/{oid}/oauth/start',json={'returnTo':'http://127.0.0.1:5173/'}).json()['data']['authorizationUrl']=='https://idp.example/auth'
    dis=c.post(f'/api/mcp/servers/{oid}/disconnect'); assert dis.status_code==200 and dis.json()['data']['enabled'] is False and dis.json()['data']['configured'] is False and dis.json()['data']['status']=='disconnected'
    assert c.get('/api/mcp/oauth/callback?state=bad').status_code==400
    router.mcp_oauth.complete_authorization=lambda *a: {'returnTo':'http://127.0.0.1:5173/ok'}
    cb=c.get('/api/mcp/oauth/callback?state=ok',follow_redirects=False); assert cb.status_code==307 and cb.headers['location']=='http://127.0.0.1:5173/ok'
    router.mcp_oauth.complete_authorization=lambda *a: {'returnTo':'https://evil.example/'}
    cb=c.get('/api/mcp/oauth/callback?state=ok',follow_redirects=False); assert cb.headers['location']=='http://127.0.0.1:8010'
    router.mcp_oauth.revoke_credentials=lambda *a: (_ for _ in ()).throw(RuntimeError())
    assert c.delete(f'/api/mcp/servers/{oid}').status_code==200 and c.get(f'/api/mcp/servers/{oid}').status_code==404
    print('ok: MCP API TestClient coverage (18 assertions)')
if __name__=='__main__': main()
