from __future__ import annotations

import ast
import importlib
import pathlib
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
RUNTIME = ROOT / "backend" / "knowflow" / "runtime.py"
KNOWLEDGE = ROOT / "backend" / "knowflow" / "routers" / "knowledge.py"


def read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


runtime_tree = ast.parse(read(RUNTIME))
top_level_names = {
    node.name
    for node in runtime_tree.body
    if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef))
}

assert "ModelGateway" not in top_level_names, "ModelGateway should live outside runtime.py"
assert "VectorStore" not in top_level_names, "VectorStore should live outside runtime.py"
assert "extract_text_from_upload" not in top_level_names, "document parsing should live outside runtime.py"

services_dir = ROOT / "backend" / "knowflow" / "services"
for name in ("model_gateway.py", "vector_store.py", "document_parser.py"):
    assert (services_dir / name).exists(), f"missing service module: {name}"

knowledge_source = read(KNOWLEDGE)
assert "read_upload_file_with_limit" in knowledge_source, "upload route should read with a hard size limit"
assert "sanitize_upload_filename" in knowledge_source, "upload route should sanitize incoming filenames"
assert "validate_upload_file" in knowledge_source, "upload route should validate files before storage"

config = importlib.import_module("knowflow.config")
assert config.MAX_UPLOAD_FILE_SIZE >= 1024 * 1024, "upload size limit is unexpectedly tiny"
assert ".md" in config.ALLOWED_UPLOAD_SUFFIXES, "markdown files should remain supported"
assert ".pdf" in config.ALLOWED_UPLOAD_SUFFIXES, "pdf files should remain supported"

print("runtime split and upload limits are in place")
