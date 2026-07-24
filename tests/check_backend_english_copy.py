from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

CHECK_FILES = [
    "frontend/index.html",
    "backend/knowflow/app.py",
    "backend/knowflow/runtime.py",
    "backend/knowflow/routers/auth.py",
    "backend/knowflow/routers/chat.py",
    "backend/knowflow/routers/extensions.py",
    "backend/knowflow/routers/knowledge.py",
    "backend/knowflow/routers/model_configs.py",
    "backend/knowflow/routers/tool_configs.py",
    "backend/knowflow/services/document_parser.py",
    "backend/knowflow/services/model_gateway.py",
]

CJK_RE = re.compile(r"[\u4e00-\u9fff]")
ALLOWED_INTERNAL_MARKERS = [
    "什么模型",
    "供应商",
    "你是谁",
    "身份",
    "总结",
    "亮点",
    "概括",
    "草稿",
    "博客",
]


def main() -> None:
    offenders = []
    for relative in CHECK_FILES:
        path = ROOT / relative
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not CJK_RE.search(line):
                continue
            if any(marker in line for marker in ALLOWED_INTERNAL_MARKERS):
                continue
            offenders.append(f"{relative}:{lineno}: {line.strip()[:140]}")
    if offenders:
        raise AssertionError("Backend and fallback user-facing copy should be English-only:\n" + "\n".join(offenders[:80]))
    print("backend user-facing copy is English-only in API docs, errors, and fallback pages")


if __name__ == "__main__":
    main()
