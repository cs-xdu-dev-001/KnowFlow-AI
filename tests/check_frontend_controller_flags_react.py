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
    controller = "frontend/react/src/controller/knowflowController.js"
    bridge = "frontend/react/src/controller/bridgeBindings.js"

    require(controller, 'from "./bridgeBindings.js"', "controller imports consolidated React bridge module")
    require(controller, "bindReactControllerEvents", "controller delegates React bridge binding")
    require(bridge, "export function bindReactControllerEvents", "consolidated React bridge binder")

    for event_name in [
        "knowflow:react-auth-success",
        "knowflow:react-auth-logout",
        "knowflow:react-page-change",
        "knowflow:react-new-chat",
        "knowflow:react-refresh",
        "knowflow:react-chat-files-change",
        "knowflow:react-chat-submit",
    ]:
        require(bridge, event_name, f"{event_name} bridge remains in bridge module")

    for flag in [
        "__knowflowReactAuthEnabled",
        "__knowflowReactNavigationEnabled",
        "__knowflowReactShellActionsEnabled",
        "__knowflowReactUserMenuEnabled",
        "__knowflowReactComposerChromeEnabled",
        "__knowflowReactContextControlsEnabled",
        "__knowflowReactFormActionsEnabled",
        "__knowflowReactChatInputEnabled",
    ]:
        forbid(controller, flag, f"dead React ownership flag {flag}")
        forbid(bridge, flag, f"dead React ownership flag {flag}")

    for selector in [
        "if (!window.__knowflowReactAuthEnabled)",
        "if (!window.__knowflowReactNavigationEnabled)",
        "if (!window.__knowflowReactShellActionsEnabled)",
        "if (!window.__knowflowReactUserMenuEnabled)",
        "if (!window.__knowflowReactComposerChromeEnabled)",
        "if (!window.__knowflowReactContextControlsEnabled)",
        "if (!window.__knowflowReactFormActionsEnabled)",
        "if (!window.__knowflowReactChatInputEnabled)",
    ]:
        forbid(controller, selector, f"dead legacy DOM binding guard {selector}")
        forbid(bridge, selector, f"dead legacy DOM binding guard {selector}")

    print("legacy DOM binding ownership flags are removed")


if __name__ == "__main__":
    main()
