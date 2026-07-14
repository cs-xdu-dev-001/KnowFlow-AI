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
    require("frontend/react/src/controller/controllerState.js", "export const state", "shared controller state module")
    require("frontend/react/src/controller/controllerState.js", "export const messageRetryRequests", "message retry map module")
    require("frontend/react/src/controller/request.js", "apiRequest as request", "controller request module")
    require("frontend/react/src/api/client.js", "ApiError", "shared API error type")
    require("frontend/react/src/api/client.js", "normalizeErrorMessage", "shared API error normalization")
    require("frontend/react/src/controller/bridgeBindings.js", "export function bindReactControllerEvents", "React bridge binding module")
    require(controller, 'from "./controllerState.js"', "controller imports state module")
    require(controller, 'from "./request.js"', "controller imports request module")
    require(controller, 'from "./bridgeBindings.js"', "controller imports bridge binding module")
    forbid(controller, "const state =", "inline state object")
    forbid(controller, "const messageRetryRequests", "inline retry map")
    forbid(controller, "async function request", "inline request helper")
    forbid(controller, "function bindReactAuthBridge", "inline auth bridge binding")
    forbid(controller, "function bindReactComposerChromeBridge", "inline composer bridge binding")
    forbid(controller, "function bindReactFormActionsBridge", "inline form bridge binding")


if __name__ == "__main__":
    main()
