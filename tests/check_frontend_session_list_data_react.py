from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def require(relative_path: str, needle: str, label: str) -> None:
    if needle not in read(relative_path):
        raise AssertionError(f"Missing {label}: {needle}")


def forbid(relative_path: str, needle: str, label: str) -> None:
    if needle in read(relative_path):
        raise AssertionError(f"Legacy {label} still present: {needle}")


def main() -> None:
    require("frontend/react/src/components/Sidebar.jsx", "loadSessions", "React session loader")
    require("frontend/react/src/components/Sidebar.jsx", "sessionApi.list", "React session list API call")
    require("frontend/react/src/components/Sidebar.jsx", "knowflow:react-sessions-refresh-request", "React session refresh request listener")
    require("frontend/react/src/components/Sidebar.jsx", "setCurrentSessionId", "React session active state")
    require("frontend/react/src/controller/knowflowController.js", "knowflow:react-sessions-refresh-request", "controller requests React session list refresh")

    forbid("frontend/react/src/components/Sidebar.jsx", "knowflow:legacy-sessions-updated", "legacy session list data event")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-sessions-updated", "legacy session list broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "notifyReactSessionsUpdated", "legacy session list notifier")


if __name__ == "__main__":
    main()
