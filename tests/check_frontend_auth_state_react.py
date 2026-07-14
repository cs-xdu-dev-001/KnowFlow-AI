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
    require("frontend/react/src/App.jsx", "useAuth", "app shell reads React auth state")
    require("frontend/react/src/App.jsx", "const shellLocked", "app shell render gate")
    require("frontend/react/src/App.jsx", "{!shellLocked ? (", "workbench shell is not rendered while signed out")
    require("frontend/react/src/components/AuthScreen.jsx", "auth-loading-card", "visible auth loading card")
    require("frontend/react/src/components/AuthScreen.jsx", "正在检查登录状态", "auth loading copy")
    require("frontend/react/src/components/AuthScreen.jsx", "if (authRequired) {", "auth screen re-entry guard")
    require("frontend/react/src/components/AuthScreen.jsx", 'setMode("login");', "logout returns to login mode")
    require("frontend/react/src/auth/AuthProvider.jsx", "knowflow:react-auth-state-updated", "React auth state event listener")
    require("frontend/react/src/auth/AuthProvider.jsx", "knowflow:react-auth-required", "React auth required event listener")
    require("frontend/react/src/api/client.js", "export function notifyAuthRequired", "API auth required notifier")
    require("frontend/react/src/api/client.js", "knowflow:react-auth-required", "API auth required event")
    require("frontend/react/src/controller/reactNotifications.js", "knowflow:react-auth-state-updated", "controller auth state React event")
    require("frontend/react/src/controller/chatFlow.js", "notifyAuthRequired", "stream auth failure notification")
    require("frontend/react/src/components/AuthScreen.jsx", "auth-provider-button unavailable", "disabled GitHub button has low emphasis")
    require("frontend/styles.css", ".auth-provider-button.unavailable", "disabled GitHub button style")
    require(
        "frontend/styles.css",
        ':root[data-theme="mono-dark"] .auth-form button[type="submit"]',
        "dark auth submit contrast",
    )

    forbid("frontend/react/src/auth/AuthProvider.jsx", "knowflow:legacy-auth-state-updated", "legacy auth state listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-auth-state-updated", "legacy auth state broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactAuthStateEnabled", "dead auth state ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "#auth-screen", "legacy auth screen DOM access")
    forbid("frontend/react/src/controller/knowflowController.js", "#app-shell", "legacy app shell auth lock DOM access")
    forbid("frontend/react/src/controller/knowflowController.js", "github-login-btn", "legacy GitHub button DOM access")
    forbid("frontend/react/src/controller/knowflowController.js", "github-callback-url", "legacy GitHub callback DOM access")
    forbid("frontend/react/src/controller/knowflowController.js", "user-display-name", "legacy user display DOM access")
    forbid("frontend/react/src/controller/knowflowController.js", "user-email", "legacy user email DOM access")
    forbid("frontend/react/src/controller/knowflowController.js", "user-avatar", "legacy user avatar DOM access")
    forbid("frontend/react/src/controller/knowflowController.js", "function showAuthMessage", "legacy auth message renderer")
    forbid("frontend/react/src/controller/knowflowController.js", "function clearAuthMessage", "legacy auth message reset")
    forbid("frontend/react/src/controller/knowflowController.js", "function setAuthMode", "legacy auth tab controller")
    forbid("frontend/react/src/controller/knowflowController.js", "function submitLogin", "legacy login submit handler")
    forbid("frontend/react/src/controller/knowflowController.js", "function submitRegister", "legacy register submit handler")
    forbid("frontend/react/src/controller/knowflowController.js", "[data-auth-mode]", "legacy auth mode DOM selector")
    forbid("frontend/react/src/controller/knowflowController.js", "auth-login-message", "legacy login message DOM selector")
    forbid("frontend/react/src/controller/knowflowController.js", "auth-register-message", "legacy register message DOM selector")

    print("auth state updates use the React event channel")


if __name__ == "__main__":
    main()
