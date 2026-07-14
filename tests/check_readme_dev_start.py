from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(path: str, needle: str, label: str) -> None:
    text = read(path)
    if needle not in text:
        raise AssertionError(f"missing {label} in {path}: {needle}")


def forbid(path: str, needle: str, label: str) -> None:
    text = read(path)
    if needle in text:
        raise AssertionError(f"unexpected {label} in {path}: {needle}")


def main() -> None:
    require("start-dev.cmd", "KNOWFLOW_BACKEND_PORT=8010", "default backend port")
    require("start-dev.cmd", "VITE_BACKEND_URL=http://127.0.0.1:%KNOWFLOW_BACKEND_PORT%", "frontend backend URL wiring")
    require("start-dev.cmd", "KNOWFLOW_BASE_URL=%VITE_BACKEND_URL%", "OAuth base URL follows backend port")
    require("start-dev.cmd", "KNOWFLOW_FRONTEND_ORIGIN=http://%KNOWFLOW_FRONTEND_HOST%:%KNOWFLOW_FRONTEND_PORT%", "frontend origin wiring")
    require("start-dev.cmd", "KNOWFLOW_OAUTH_RETURN_ORIGINS=%KNOWFLOW_FRONTEND_ORIGIN%", "OAuth return origin wiring")
    require("start-dev.cmd", "--strictPort", "fixed frontend port")
    require("start-dev.cmd", "--check", "check mode")
    require("frontend/vite.config.js", '"http://127.0.0.1:8010"', "Vite fallback backend URL")
    require("backend/knowflow/config.py", '"http://127.0.0.1:8010"', "backend public base URL default")
    require("backend/.env.example", "KNOWFLOW_BASE_URL=http://127.0.0.1:8010", "env example base URL")
    require("backend/.env.example", "KNOWFLOW_OAUTH_RETURN_ORIGINS=http://127.0.0.1:5173,http://localhost:5173", "env example OAuth return origins")
    require("backend/.env.example", "KNOWFLOW_ADOPT_LEGACY_DATA=0", "env example legacy adoption default")
    require("backend/.env.example", "http://127.0.0.1:8010/api/auth/oauth/github/callback", "env example OAuth callback")
    require("README.md", "start-dev.cmd", "one-command Windows startup")
    require("README.md", "http://127.0.0.1:8010", "recommended backend URL")
    require("README.md", "VITE_BACKEND_URL=http://127.0.0.1:8010", "manual frontend env example")
    require("README.md", "KNOWFLOW_OAUTH_RETURN_ORIGINS", "OAuth return origin documentation")
    require("README.md", "KNOWFLOW_ADOPT_LEGACY_DATA", "legacy adoption documentation")
    require("README.md", "--strictPort", "fixed Vite port documentation")
    require("README.md", "WinError 10013", "Windows 8000 port troubleshooting")
    require("README.md", "start-dev.cmd --check", "startup check command")
    forbid("README.md", "automatically print the next available URL", "stale Vite auto-port guidance")
    forbid("README.md", "http://127.0.0.1:8000", "stale local backend URL")
    forbid("backend/.env.example", "http://127.0.0.1:8000", "stale env example local URL")
    forbid("frontend/vite.config.js", '"http://127.0.0.1:8000"', "stale Vite fallback backend URL")


if __name__ == "__main__":
    main()
