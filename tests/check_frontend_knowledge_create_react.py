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
    require("frontend/react/src/components/KnowledgeModals.jsx", "knowledgeApi", "React knowledge modal API import")
    require("frontend/react/src/components/KnowledgeModals.jsx", "knowledgeApi.create", "React knowledge create request")
    require("frontend/react/src/components/KnowledgeModals.jsx", "handleKnowledgeBaseSubmit", "React knowledge create submit handler")
    require(
        "frontend/react/src/components/KnowledgeModals.jsx",
        "knowflow:react-knowledge-bases-refresh-request",
        "React knowledge create refresh request",
    )
    require(
        "frontend/react/src/components/KnowledgeRail.jsx",
        "knowflow:react-knowledge-bases-refresh-request",
        "React knowledge list refresh listener",
    )

    forbid("frontend/react/src/components/KnowledgeModals.jsx", "knowflow:react-kb-submit", "legacy knowledge create submit event")
    forbid("frontend/react/src/controller/knowflowController.js", "function submitKnowledgeBaseForm", "legacy knowledge create submitter")
    forbid("frontend/react/src/controller/knowflowController.js", "knowflow:react-kb-submit", "legacy knowledge create submit listener")

    print("knowledge base creation is owned by React")


if __name__ == "__main__":
    main()
