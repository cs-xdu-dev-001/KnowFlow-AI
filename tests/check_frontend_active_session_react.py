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
    require("frontend/react/src/components/Sidebar.jsx", "knowflow:react-active-session-updated", "React sidebar active-session event")
    require("frontend/react/src/components/ChatContextToolbar.jsx", "knowflow:react-active-session-updated", "React toolbar active-session event")
    require("frontend/react/src/controller/knowflowController.js", "knowflow:react-active-session-updated", "controller active-session React event")

    forbid("frontend/react/src/components/Sidebar.jsx", "knowflow:legacy-active-session-updated", "legacy active-session sidebar listener")
    forbid("frontend/react/src/components/ChatContextToolbar.jsx", "knowflow:legacy-active-session-updated", "legacy active-session toolbar listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-active-session-updated", "legacy active-session broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactActiveSessionEnabled", "dead active-session ownership flag")

    print("active session state is delivered through the React event channel")


if __name__ == "__main__":
    main()
