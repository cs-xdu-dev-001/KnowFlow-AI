import asyncio,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'backend'))
from knowflow.services.mcp_client import *

class Fake:
 def __init__(self): self.init=0; self.calls=0; self.closed=False
 async def initialize(self): self.init+=1
 async def list_tools(self,**kw): return {'tools':[{'name':'echo','description':'x','inputSchema':{},'annotations':{'readOnlyHint':True}}]}
 async def call_tool(self,n,a): self.calls+=1; return {'content':[{'type':'text','text':'ok'},{'type':'image','data':'SECRET'}], 'structuredContent':{'x':1}}
class T(unittest.TestCase):
 def test_name_and_normalize(self):
  self.assertLessEqual(len(model_tool_name('a'*100,'b'*100)),64)
  x=normalize_result({'content':[{'type':'image','data':'x'}]}); self.assertNotIn('data',str(x)); self.assertIsNone(x['structuredContent'])
 def test_discover_and_pool(self):
  f=Fake()
  async def factory(url,headers): return f
  c=McpRemoteClient('s','https://example.com',session_factory=factory,resolver=lambda h,p:[(0,0,0,'x',('8.8.8.8',p))])
  # injected factory still validates DNS
  snap=asyncio.run(c.discover_tools()); self.assertEqual(snap[0]['remoteName'],'echo'); self.assertEqual(snap[0]['annotations']['readOnlyHint'],True)
  with McpRunSessionPool(server_loader=lambda sid:c) as p:
   self.assertEqual(p.call_tool('s','echo')['content'],'ok'); self.assertEqual(p.call_tool('s','echo')['content'],'ok')
  self.assertEqual(f.init,2); self.assertEqual(f.calls,2)
if __name__=='__main__': unittest.main()
