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
    require("frontend/react/src/components/Toast.jsx", "knowflow:react-toast", "React toast event")
    require("frontend/react/src/components/Toast.jsx", "toastTimerRef", "React toast hide timer")
    require("frontend/react/src/components/Toast.jsx", "setVisible(true)", "React toast visible state")
    require("frontend/react/src/controller/reactNotifications.js", "knowflow:react-toast", "controller dispatches React toast event")

    forbid("frontend/react/src/components/Toast.jsx", "knowflow:legacy-toast", "legacy toast event listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-toast", "legacy toast event dispatch")
    forbid("frontend/react/src/controller/knowflowController.js", "notifyReactToast", "legacy toast notifier")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactToastEnabled", "legacy toast ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "$(\"#toast\")", "legacy toast DOM access")
    forbid("frontend/react/src/controller/knowflowController.js", "toast.timer", "legacy toast timer")


if __name__ == "__main__":
    main()
