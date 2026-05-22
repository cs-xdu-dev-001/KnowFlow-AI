import importlib
import os
import sys
import tempfile
from pathlib import Path

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:
    TestClient = None


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def main() -> None:
    if TestClient is None:
        print("skipped: fastapi test client is not installed in this interpreter")
        return
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        os.environ["KNOWFLOW_DB_URL"] = f"sqlite:///{Path(tmpdir, 'auth-test.db').as_posix()}"
        os.environ["KNOWFLOW_SECRET_KEY"] = "auth-flow-test-secret"
        sys.path.insert(0, str(BACKEND))
        main_module = importlib.import_module("main")
        client = TestClient(main_module.app)

        locked = client.get("/api/model-configs")
        assert locked.status_code == 401, locked.text

        missing_login = client.post("/api/auth/login", json={"account": "missing", "password": "123456"})
        assert missing_login.status_code == 401, missing_login.text
        missing_body = missing_login.json()
        assert missing_body["code"] == 40102, missing_body
        assert "账号不存在" in missing_body["message"], missing_body

        invalid_register = client.post(
            "/api/auth/register",
            json={"username": "x", "email": "bad-email", "password": "123", "displayName": "Bad"},
        )
        assert invalid_register.status_code == 422, invalid_register.text
        invalid_body = invalid_register.json()
        assert invalid_body["code"] == 42200, invalid_body
        assert "参数错误" in invalid_body["message"], invalid_body

        registered = client.post(
            "/api/auth/register",
            json={"username": "tester", "email": "tester@example.com", "password": "123456", "displayName": "Tester"},
        )
        assert registered.status_code == 200, registered.text
        assert "knowflow_session" in registered.headers.get("set-cookie", "")
        assert registered.json()["data"]["user"]["username"] == "tester"

        wrong_password = client.post("/api/auth/login", json={"account": "tester", "password": "bad-password"})
        assert wrong_password.status_code == 401, wrong_password.text
        wrong_body = wrong_password.json()
        assert wrong_body["code"] == 40103, wrong_body
        assert "密码不正确" in wrong_body["message"], wrong_body

        me = client.get("/api/auth/me")
        assert me.status_code == 200, me.text
        assert me.json()["data"]["authenticated"] is True

        unlocked = client.get("/api/model-configs")
        assert unlocked.status_code == 200, unlocked.text

        logout = client.post("/api/auth/logout")
        assert logout.status_code == 200, logout.text

        locked_again = client.get("/api/model-configs")
        assert locked_again.status_code == 401, locked_again.text


if __name__ == "__main__":
    main()
