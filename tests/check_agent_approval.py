from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from knowflow.services.agent_loop import ToolRegistry
from knowflow.services.agent_trace import AgentTraceRecorder

def call(args): return {"id":"c1","function":{"name":"dyn","arguments":args}}
def main():
    seen=[]; schema={"type":"object","properties":{"query":{"type":"string"}},"required":["query"],"additionalProperties":False}
    r=ToolRegistry(); r.register(name="dyn",description="d",input_schema=schema,handler=lambda x: seen.append(x) or {"ok":1},trace_kind="mcp",risk="write",server_name="srv")
    assert r.schemas()[0]["function"]["parameters"] is schema
    for bad in ['{}','{"query":1}','{"query":"x","extra":1}']:
        e=r.execute(call(bad)); assert e.error_code=="invalid_arguments" and not seen
    assert r.execute(call('{"query":"x"}')).status=="success" and seen==[{"query":"x"}]
    print("dynamic tool schema validation works")
if __name__ == "__main__": main()
