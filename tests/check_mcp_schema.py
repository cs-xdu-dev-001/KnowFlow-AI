import os, sys, re
from importlib.metadata import version
from packaging.version import Version
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BACKEND=ROOT/'backend'
db=ROOT/'data'/'test-dbs'/'mcp-schema.db'; db.parent.mkdir(parents=True,exist_ok=True)
if db.exists(): db.unlink()
os.environ['KNOWFLOW_DB_URL']=f'sqlite:///{db.as_posix()}'; os.environ['KNOWFLOW_VECTOR_BACKEND']='local'; sys.path.insert(0,str(BACKEND))
from knowflow.runtime import fetch_all
expected_server=['id','user_id','name','slug','url','auth_type','enabled','status','credentials_cipher','tools_json','enabled_tools_json','last_error_code','last_connected_at','created_at','updated_at']
expected_oauth=['id','user_id','server_id','state_hash','pkce_verifier_cipher','return_to','expires_at','created_at']
assert [r['name'] for r in fetch_all('PRAGMA table_info(mcp_server)')]==expected_server
assert [r['name'] for r in fetch_all('PRAGMA table_info(mcp_oauth_session)')]==expected_oauth
assert Version(version('pydantic')) >= Version('2.11'), version('pydantic')
from knowflow.db_schema import MYSQL_SCHEMA
for token in ('uk_mcp_server_user_slug','idx_mcp_oauth_user','idx_mcp_oauth_expires'): assert token in MYSQL_SCHEMA
for column in ('credentials_cipher','tools_json','enabled_tools_json','pkce_verifier_cipher'):
    assert re.search(r'\\b'+column+r'\\s+LONGTEXT\\b', MYSQL_SCHEMA), column
print('MCP schema checks passed')
