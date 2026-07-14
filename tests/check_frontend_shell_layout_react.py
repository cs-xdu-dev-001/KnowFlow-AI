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
    require("frontend/react/src/App.jsx", "sidebarCollapsed", "React shell sidebar collapse state")
    require("frontend/react/src/App.jsx", "drawerCollapsed", "React shell drawer collapse state")
    require("frontend/react/src/App.jsx", "knowflow:react-sidebar-toggle", "React shell receives sidebar toggle")
    require("frontend/react/src/App.jsx", "knowflow:react-drawer-toggle", "React shell receives drawer toggle")
    require("frontend/react/src/App.jsx", "knowflow:react-drawer-close", "React shell receives drawer close")
    require("frontend/react/src/App.jsx", "document.body.classList.toggle(\"sidebar-collapsed\"", "React shell syncs sidebar body class")
    require("frontend/react/src/App.jsx", "document.body.classList.toggle(\"drawer-collapsed\"", "React shell syncs drawer body class")
    require("frontend/react/src/App.jsx", "knowflow.sidebarCollapsed", "React shell persists sidebar layout")
    require("frontend/react/src/App.jsx", "knowflow.drawerCollapsed", "React shell persists drawer layout")
    require("frontend/react/src/App.jsx", "<Sidebar activePage={activePage} collapsed={sidebarCollapsed}", "Sidebar receives collapsed prop")
    require("frontend/react/src/components/Sidebar.jsx", "collapsed = false", "Sidebar collapsed prop default")
    require("frontend/react/src/components/Sidebar.jsx", "sidebarClassName", "Sidebar renders collapsed class from React")
    require("frontend/react/src/components/Sidebar.jsx", "sidebarToggleLabel", "Sidebar renders toggle label from React")
    require("frontend/react/src/components/Sidebar.jsx", "function SidebarToolIcon", "Sidebar renders real tool icons")
    require("frontend/react/src/components/Sidebar.jsx", "<svg", "Sidebar tool icons are SVG")
    require("frontend/styles.css", ".sidebar-tool .nav-icon svg", "Sidebar SVG icon style")

    css = read("frontend/styles.css")
    desktop_shell_index = css.rfind("/* ChatGPT-aligned shell pass")
    mobile_guard_index = css.rfind("/* Final mobile shell guard")
    if desktop_shell_index < 0:
        raise AssertionError("missing late desktop shell layout marker")
    if mobile_guard_index <= desktop_shell_index:
        raise AssertionError("final mobile shell guard must come after late desktop shell overrides")
    mobile_guard = css[mobile_guard_index:]
    for needle, label in [
        ("grid-template-columns: minmax(0, 1fr) !important;", "single-column mobile app shell"),
        ("grid-template-rows: 64px minmax(0, 1fr) !important;", "viewport-filling mobile shell rows"),
        ("height: 100dvh;", "mobile shell viewport height"),
        ("width: 100% !important;", "full-width mobile sidebar"),
        ("#page-chat .chat-panel", "mobile chat panel height override"),
    ]:
        if needle not in mobile_guard:
            raise AssertionError(f"missing {label} after desktop shell overrides: {needle}")

    for needle, label in [
        ('icon: "KB"', "letter knowledge icon"),
        ('icon: "SET"', "letter settings icon"),
        ('icon: "API"', "letter API icon"),
    ]:
        forbid("frontend/react/src/data/navigation.js", needle, label)

    for needle, label in [
        ('collapsed ? ">" : "<"', "raw sidebar toggle text"),
        ('{"+"}', "raw new-chat plus text"),
    ]:
        forbid("frontend/react/src/components/Sidebar.jsx", needle, label)

    for needle, label in [
        ("function toggleSidebar", "legacy sidebar toggle function"),
        ("function applySidebarState", "legacy sidebar DOM state function"),
        ("function toggleDrawer", "legacy drawer toggle function"),
        ("function initLayout", "legacy layout bootstrap function"),
        ("sidebar.classList.toggle(\"collapsed\"", "legacy sidebar class toggle"),
        ("document.body.classList.toggle(\"sidebar-collapsed\"", "legacy sidebar body class toggle"),
        ("document.body.classList.toggle(\"drawer-collapsed\"", "legacy drawer body class toggle"),
        ("#sidebar-toggle", "legacy sidebar toggle DOM lookup"),
    ]:
        forbid("frontend/react/src/controller/knowflowController.js", needle, label)

    print("shell layout collapse state is owned by React")


if __name__ == "__main__":
    main()
