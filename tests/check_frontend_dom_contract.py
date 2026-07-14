from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    html = "\n".join(
        [((ROOT / "frontend/index.html").read_text(encoding="utf-8"))]
        + [path.read_text(encoding="utf-8") for path in sorted((ROOT / "frontend" / "react" / "src").rglob("*.jsx"))]
    )
    js = (ROOT / "frontend/react/src/controller/knowflowController.js").read_text(encoding="utf-8")
    knowledge_documents_js = (ROOT / "frontend/react/src/components/KnowledgeDocuments.jsx").read_text(encoding="utf-8")

    html_ids = set(re.findall(r'id=(?:"([^"]+)"|\{"([^"]+)"\})', html))
    html_ids = {first or second for first, second in html_ids}
    js_id_selectors = set(re.findall(r'\$\("#([A-Za-z0-9_-]+)"\)', js))
    missing = sorted(js_id_selectors - html_ids)
    if missing:
        raise AssertionError(f"JS references missing DOM ids: {', '.join(missing)}")

    required_upload_dom = {
        "document-drop-zone",
        "document-file-input",
        "document-file-name",
    }
    missing_upload_dom = sorted(required_upload_dom - html_ids)
    if missing_upload_dom:
        raise AssertionError(f"Document upload UI missing ids: {', '.join(missing_upload_dom)}")

    required_upload_behaviors = [
        "selectedDocumentFile",
        "setSelectedDocumentFile",
        "onDragOver",
        "onDrop",
        "\u4e0a\u4f20\u5931\u8d25",
        "\u8bf7\u5148\u9009\u62e9\u6587\u6863",
    ]
    missing_upload_behaviors = [token for token in required_upload_behaviors if token not in knowledge_documents_js]
    if missing_upload_behaviors:
        raise AssertionError(f"Document upload behavior missing: {', '.join(missing_upload_behaviors)}")

    unsafe_event_bindings = re.findall(
        r'\$\("#[A-Za-z0-9_-]+"\)\.addEventListener|document\.querySelector\([^)]*\)\.addEventListener',
        js,
    )
    if unsafe_event_bindings:
        raise AssertionError("Unsafe direct DOM event bindings found in the React controller")

    if "function on(selector, eventName, handler" in js:
        raise AssertionError("Legacy DOM binding helper should not return to the React controller")


if __name__ == "__main__":
    main()

