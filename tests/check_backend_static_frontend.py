import importlib
import os
import shutil
import sys
from pathlib import Path

try:
    from fastapi.testclient import TestClient
except ModuleNotFoundError:
    TestClient = None


ROOT = Path(__file__).resolve().parents[1]


def require(path: Path, label: str) -> None:
    if not path.exists():
        raise AssertionError(f"missing {label}: {path.relative_to(ROOT)}")


def main() -> None:
    dist = ROOT / "frontend" / "dist"
    index = dist / "index.html"
    vendor = dist / "vendor"
    favicon = dist / "favicon.svg"
    backend = "\n".join((ROOT / "backend" / "knowflow" / name).read_text(encoding="utf-8") for name in ["config.py", "app.py"])
    html = index.read_text(encoding="utf-8")

    require(index, "built frontend index")
    require(favicon, "KnowFlow favicon")
    require(vendor / "react.production.min.js", "React vendor asset")
    require(vendor / "react-dom.production.min.js", "React DOM vendor asset")
    if 'src="/vendor/react.production.min.js"' not in html:
        raise AssertionError("frontend index must load React from /vendor")
    if 'src="/vendor/react-dom.production.min.js"' not in html:
        raise AssertionError("frontend index must load React DOM from /vendor")
    if 'rel="icon" href="/favicon.svg"' not in html:
        raise AssertionError("frontend index must declare the KnowFlow favicon")
    react_pos = html.find('src="/vendor/react.production.min.js"')
    react_dom_pos = html.find('src="/vendor/react-dom.production.min.js"')
    app_pos = html.find('type="module"')
    if not (0 <= react_pos < app_pos and 0 <= react_dom_pos < app_pos):
        raise AssertionError("React vendor scripts must load before the application module")
    if 'StaticFiles(directory=FRONTEND_VENDOR_DIR)' not in backend:
        raise AssertionError("backend must mount FRONTEND_VENDOR_DIR at /vendor")
    if 'FRONTEND_STATIC_DIR / "vendor"' not in backend:
        raise AssertionError("backend config must serve built vendor assets from frontend/dist/vendor")
    if '@app.get("/favicon.ico"' not in backend or 'FRONTEND_STATIC_DIR / "favicon.svg"' not in backend:
        raise AssertionError("backend must serve the KnowFlow favicon without a 404")
    verify_vendor_route_after_late_asset_sync(dist, vendor)


def verify_vendor_route_after_late_asset_sync(dist: Path, vendor: Path) -> None:
    if TestClient is None:
        print("skipped: fastapi test client is not installed in this interpreter")
        return
    public_vendor = ROOT / "frontend" / "react" / "public" / "vendor"
    public_react = public_vendor / "react.production.min.js"
    if not public_react.exists():
        print("skipped: React public vendor asset is not synced")
        return

    temp_vendor = dist / "vendor.check-backend-static-tmp"
    if temp_vendor.exists():
        shutil.rmtree(temp_vendor)
    moved = False
    if vendor.exists():
        vendor.rename(temp_vendor)
        moved = True

    try:
        db_path = ROOT / "data" / "test-dbs" / "static-frontend-test.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        db_path.unlink(missing_ok=True)
        os.environ["KNOWFLOW_DB_URL"] = f"sqlite:///{db_path.as_posix()}"
        os.environ["KNOWFLOW_SECRET_KEY"] = "static-frontend-test-secret"
        os.environ["KNOWFLOW_BASE_URL"] = "http://127.0.0.1:8010"
        sys.path.insert(0, str(ROOT / "backend"))
        for module_name in list(sys.modules):
            if module_name == "main" or module_name.startswith("knowflow"):
                del sys.modules[module_name]
        main_module = importlib.import_module("main")
        client = TestClient(main_module.app)
        response = client.get("/vendor/react.production.min.js")
        assert response.status_code == 200, response.text
        assert response.content.startswith(b"/**") or b"React" in response.content[:2000]
        favicon_response = client.get("/favicon.ico")
        assert favicon_response.status_code == 200, favicon_response.text
        assert b"<svg" in favicon_response.content[:200]
    finally:
        for module_name in list(sys.modules):
            if module_name == "main" or module_name.startswith("knowflow"):
                del sys.modules[module_name]
        if moved:
            vendor.parent.mkdir(parents=True, exist_ok=True)
            temp_vendor.rename(vendor)


if __name__ == "__main__":
    main()
