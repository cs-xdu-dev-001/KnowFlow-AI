from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise AssertionError(f"missing {label}: {needle}")


def main() -> None:
    backend = "\n".join(path.read_text(encoding="utf-8") for path in sorted((ROOT / "backend" / "knowflow").rglob("*.py")))
    app_js = read("frontend/react/src/controller/knowflowController.js")
    styles = read("frontend/styles.css")

    require(backend, "CREATE TABLE IF NOT EXISTS retrieval_run", "retrieval run table")
    require(backend, "assess_retrieval_quality", "retrieval quality assessment")
    require(backend, "record_retrieval_run", "retrieval run persistence")
    require(backend, "update_retrieval_run_message", "retrieval run message link")
    require(backend, "\"ragQuality\"", "chat response quality payload")
    require(backend, "\"retrievalRun\"", "retrieval debug run payload")
    require(backend, "\"matchedTerms\"", "retrieval debug matched terms")
    require(backend, '"/api/retrieval/runs/{run_id}"', "retrieval run detail endpoint")
    require(backend, "RETRIEVAL_SCORE_THRESHOLD", "score threshold setting")
    require(backend, "\"avgScore\"", "average retrieval score")
    require(backend, "\"belowThresholdCount\"", "below-threshold score count")
    require(backend, "\"scoreBuckets\"", "retrieval score buckets")

    require(app_js, "renderRagQuality", "frontend quality rendering")
    require(app_js, "ragQuality", "frontend consumes quality payload")
    require(app_js, "openRetrievalDrawerFromRun", "frontend debug action from answer")
    require(read("frontend/react/src/components/ChatEvidenceDrawer.jsx"), "rag-quality-metrics", "frontend quality metrics")
    require(styles, ".rag-quality-card", "RAG quality card style")
    require(styles, ".quality-metrics", "RAG quality metrics style")
    require(styles, ".quality-level", "quality level style")

    print("rag quality contract is present")


if __name__ == "__main__":
    main()

