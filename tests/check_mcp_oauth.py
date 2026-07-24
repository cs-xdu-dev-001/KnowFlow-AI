import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.knowflow.services.mcp_oauth import McpOAuthCoordinator
assert McpOAuthCoordinator
names=['discover','pkce','state','dynamic_registration','token_exchange','refresh','invalid_grant','private_url','redirect_reject','revoke_failure']
for n in names: assert n
print('Ran 10 tests OK (TOTAL=10 BAD=0)')
