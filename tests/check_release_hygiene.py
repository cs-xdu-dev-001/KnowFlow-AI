from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEXT_SUFFIXES = {".py", ".js", ".jsx", ".mjs", ".html", ".css", ".md", ".txt", ".json", ".yml", ".yaml", ".toml", ".cmd", ".sql"}
IGNORED_PARTS = {".git", "node_modules", "dist", "__pycache__"}
FORBIDDEN_TEXT = ["?" * 4, "\ufeff"]
FORBIDDEN_TRACKED_PATTERNS = [
    "backend/.env",
    "frontend/.env",
    "data/knowflow.db",
    "data/test-dbs/",
    "data/test-uploads/",
    "frontend/react/public/vendor/",
    "frontend/node_modules/",
    "frontend/dist/",
]


def iter_text_files():
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT).as_posix()
        if any(part in IGNORED_PARTS for part in relative.split("/")):
            continue
        if path.suffix in TEXT_SUFFIXES or path.name in {".gitignore", ".gitattributes"}:
            yield path


def tracked_files() -> list[str]:
    git_dir = ROOT / ".git"
    if not git_dir.exists():
        return []
    import subprocess

    result = subprocess.run(
        ["git", "-c", f"safe.directory={ROOT.as_posix()}", "-C", str(ROOT), "ls-files"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return [line.strip().replace("\\", "/") for line in result.stdout.splitlines() if line.strip()]


def main() -> None:
    text_offenders = []
    for path in iter_text_files():
        text = path.read_text(encoding="utf-8", errors="replace")
        for token in FORBIDDEN_TEXT:
            if token in text:
                text_offenders.append(f"{path.relative_to(ROOT).as_posix()}: contains {token!r}")
    if text_offenders:
        raise AssertionError("release hygiene text issues:\n" + "\n".join(text_offenders[:80]))

    tracked = tracked_files()
    tracked_offenders = [
        path
        for path in tracked
        for pattern in FORBIDDEN_TRACKED_PATTERNS
        if not path.endswith(".env.example")
        if path == pattern.rstrip("/") or path.startswith(pattern)
    ]
    if tracked_offenders:
        raise AssertionError("sensitive or generated files are tracked:\n" + "\n".join(sorted(set(tracked_offenders))))

    print("release hygiene checks passed")


if __name__ == "__main__":
    main()
