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
    require("frontend/react/src/components/ChatEvidenceDrawer.jsx", "knowflow:react-references-updated", "React references event")
    require("frontend/react/src/components/ChatEvidenceDrawer.jsx", "knowflow:react-tool-timeline-updated", "React tool timeline event")
    require("frontend/react/src/components/ChatEvidenceDrawer.jsx", "knowflow:react-rag-quality-updated", "React RAG quality event")
    require("frontend/react/src/controller/knowflowController.js", "knowflow:react-references-updated", "controller references React event")
    require("frontend/react/src/controller/knowflowController.js", "knowflow:react-tool-timeline-updated", "controller tool timeline React event")
    require("frontend/react/src/controller/knowflowController.js", "knowflow:react-rag-quality-updated", "controller RAG quality React event")

    forbid("frontend/react/src/components/ChatEvidenceDrawer.jsx", "knowflow:legacy-references-updated", "legacy references listener")
    forbid("frontend/react/src/components/ChatEvidenceDrawer.jsx", "knowflow:legacy-tool-timeline-updated", "legacy tool timeline listener")
    forbid("frontend/react/src/components/ChatEvidenceDrawer.jsx", "knowflow:legacy-rag-quality-updated", "legacy RAG quality listener")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-references-updated", "legacy references broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-tool-timeline-updated", "legacy tool timeline broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:legacy-rag-quality-updated", "legacy RAG quality broadcast")
    forbid("frontend/react/src/controller/knowflowController.js", "__knowflowReactEvidenceDrawerEnabled", "dead evidence drawer ownership flag")
    forbid("frontend/react/src/controller/knowflowController.js", "$(\"#reference-list\").innerHTML", "legacy references DOM renderer")
    forbid("frontend/react/src/controller/knowflowController.js", "$(\"#tool-timeline-mini\").innerHTML", "legacy tool timeline DOM renderer")
    forbid("frontend/react/src/controller/knowflowController.js", "container.innerHTML", "legacy RAG quality DOM renderer")

    print("evidence drawer updates are owned by React")


if __name__ == "__main__":
    main()
