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
    require("frontend/react/src/api/client.js", "retrievalApi", "retrieval API helper")
    require("frontend/react/src/api/client.js", '"/api/retrieval/debug"', "retrieval debug API route")
    require("frontend/react/src/components/KnowledgeRetrievalDrawer.jsx", "retrievalApi.debug", "React retrieval debug request")
    require("frontend/react/src/components/KnowledgeRetrievalDrawer.jsx", "handleRetrievalSubmit", "React retrieval submit handler")
    require("frontend/react/src/components/KnowledgeRetrievalDrawer.jsx", "setRetrievalResults", "React retrieval result state")

    forbid("frontend/react/src/components/KnowledgeRetrievalDrawer.jsx", "knowflow:react-retrieval-submit", "legacy retrieval submit event")
    forbid("frontend/react/src/components/KnowledgeRetrievalDrawer.jsx", "knowflow:legacy-retrieval-loading", "legacy retrieval loading event")
    forbid(
        "frontend/react/src/components/KnowledgeRetrievalDrawer.jsx",
        "knowflow:legacy-retrieval-results-updated",
        "legacy retrieval result event",
    )
    forbid("frontend/react/src/controller/knowflowController.js", "function submitRetrievalForm", "legacy retrieval submitter")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-retrieval-submit", "legacy retrieval submit listener")
    forbid("frontend/react/src/controller/knowflowController.js", "notifyReactRetrievalLoading", "legacy retrieval loading notifier")
    forbid(
        "frontend/react/src/controller/knowflowController.js",
        "notifyReactRetrievalResultsUpdated",
        "legacy retrieval results notifier",
    )

    print("retrieval debug submit and results are owned by React")


if __name__ == "__main__":
    main()
