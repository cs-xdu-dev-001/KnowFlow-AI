import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.knowflow.services.mcp_security import validate_remote_url, validate_static_headers

def main():
    blocked = ["http://mcp.example/mcp", "https://localhost/mcp", "https://127.0.0.1/mcp", "https://[::1]/mcp", "https://169.254.169.254/latest/meta-data", "https://metadata.google.internal/mcp", "https://user:pass@example.com/mcp"]
    for value in blocked:
        try:
            validate_remote_url(value, resolver=lambda h,p: ["93.184.216.34"])
        except ValueError:
            pass
        else:
            raise AssertionError(value)
    assert validate_remote_url("https://mcp.example.com/mcp", resolver=lambda h,p: ["93.184.216.34"]) == "https://mcp.example.com/mcp"
    assert validate_static_headers({"Authorization": "Bearer x"}) == {"Authorization": "Bearer x"}
    for headers in ({"Host":"x"},{"Cookie":"x"},{"X":"a\r\nb"},{"X":"x"*8193}):
        try: validate_static_headers(headers)
        except ValueError: pass
        else: raise AssertionError(headers)
    print("mcp url policy checks passed")

if __name__ == "__main__": main()
