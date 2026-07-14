from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def read_backend() -> str:
    files = [ROOT / "backend" / "main.py", *sorted((ROOT / "backend" / "knowflow").rglob("*.py"))]
    return "\n".join(path.read_text(encoding="utf-8") for path in files)


def read_frontend() -> str:
    files = [ROOT / "frontend" / "index.html", *sorted((ROOT / "frontend" / "react" / "src").rglob("*.*"))]
    return "\n".join(path.read_text(encoding="utf-8") for path in files if path.is_file())


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise AssertionError(f"missing {label}: {needle}")


def require_any(text: str, needles: tuple[str, ...], label: str) -> None:
    if not any(needle in text for needle in needles):
        raise AssertionError(f"missing {label}: {' or '.join(needles)}")


def main() -> None:
    backend = read_backend()
    frontend = read_frontend()
    app_js = "\n".join([
        read("frontend/react/src/controller/knowflowController.js"),
        read("frontend/react/src/controller/request.js"),
        read("frontend/react/src/controller/bridgeBindings.js"),
        read("frontend/react/src/api/client.js"),
    ])
    styles = read("frontend/styles.css")
    readme = read("README.md")
    env_example = read("backend/.env.example")

    for token, label in [
        ("CREATE TABLE IF NOT EXISTS app_user", "user table"),
        ("CREATE TABLE IF NOT EXISTS oauth_account", "oauth account table"),
        ("CREATE TABLE IF NOT EXISTS auth_session", "auth session table"),
        ("KNOWFLOW_BASE_URL", "base url env"),
        ("KNOWFLOW_GITHUB_CLIENT_ID", "GitHub OAuth client id env"),
        ("KNOWFLOW_GITHUB_CLIENT_SECRET", "GitHub OAuth secret env"),
        ("SESSION_COOKIE_NAME", "session cookie constant"),
        ("hash_password", "password hashing"),
        ("verify_password", "password verification"),
        ("raise_api_error", "structured API error helper"),
        ("Account not found", "missing account login message"),
        ("Incorrect password", "wrong password login message"),
        ("create_auth_session", "server session creation"),
        ("get_current_user", "current user resolver"),
        ("exception_handler(HTTPException)", "structured http exception handler"),
        ('@app.middleware("http")', "auth middleware"),
        ('"/api/auth/me"', "me endpoint"),
        ('"/api/auth/login"', "login endpoint"),
        ('"/api/auth/register"', "register endpoint"),
        ('"/api/auth/logout"', "logout endpoint"),
        ('"/api/auth/oauth/github/start"', "GitHub OAuth start endpoint"),
        ('"/api/auth/oauth/github/callback"', "GitHub OAuth callback endpoint"),
        ("oauthProviders", "me endpoint provider status"),
        ("callbackUrl", "oauth callback url status"),
        ("set_cookie", "cookie setting"),
        ("httponly=True", "http only cookie"),
        ("delete_cookie", "cookie clearing"),
    ]:
        require(backend, token, label)

    for token, label in [
        ("auth-screen", "auth screen"),
        ("login-form", "login form"),
        ("register-form", "register form"),
        ("auth-login-message", "inline login error message"),
        ("auth-register-message", "inline register error message"),
        ("github-login-btn", "github login button"),
        ("github-callback-url", "github callback url"),
        ("copy-github-callback-btn", "copy github callback button"),
        ("GitHub", "GitHub login copy"),
        ("github-callback-url", "GitHub callback copy"),
    ]:
        require(frontend, token, label)
    for element_id, label in [
        ("user-menu-btn", "user menu button"),
        ("logout-btn", "logout button"),
    ]:
        require_any(frontend, (f'id="{element_id}"', f'id={{"{element_id}"}}'), label)
    require(frontend, "/api/auth/oauth/github/start", "github start path")
    require(frontend, "returnTo", "github oauth frontend return target")
    require(frontend, "encodeURIComponent", "github oauth safe return encoding")
    require(frontend, "copy-github-callback-btn", "copy github callback binding")
    for token, label in [
        ('"/api/auth/me"', "React me request"),
        ('"/api/auth/login"', "React login request"),
        ('"/api/auth/register"', "React register request"),
        ('"/api/auth/logout"', "React logout request"),
        ("handleLogin", "React login submit handler"),
        ("handleRegister", "React register submit handler"),
        ("setAuthMessage", "React inline auth error rendering"),
        ("authMessages", "React inline auth error state"),
    ]:
        require(frontend, token, label)

    for token, label in [
        ("currentUser", "frontend current user state"),
        ("checkAuth", "auth bootstrap"),
        ("showAuthScreen", "auth gate"),
        ("renderCurrentUser", "user render"),
        ("ApiError", "frontend api error type"),
        ("notifyAuthRequired", "frontend 401 auth notification"),
        ("knowflow:react-auth-logout", "React logout bridge"),
        ('"/api/auth/me"', "me request"),
        ("credentials: \"include\"", "cookie credentials"),
        ("response.status === 401", "401 auth handling"),
    ]:
        require(app_js, token, label)

    for token, label in [
        (".auth-screen", "auth screen style"),
        (".auth-card", "auth card style"),
        (".auth-provider-button", "provider button style"),
        (".user-menu", "user menu style"),
        (".user-avatar", "user avatar style"),
    ]:
        require(styles, token, label)

    for token, label in [
        ("Auth Mode", "README auth docs"),
        ("GitHub OAuth", "README OAuth docs"),
        ("KNOWFLOW_GITHUB_CLIENT_ID", "README OAuth env"),
    ]:
        require(readme, token, label)

    for token, label in [
        ("KNOWFLOW_BASE_URL=http://127.0.0.1:8010", "env base url example"),
        ("KNOWFLOW_GITHUB_CLIENT_ID=", "env github client id"),
        ("KNOWFLOW_GITHUB_CLIENT_SECRET=", "env github client secret"),
        ("KNOWFLOW_COOKIE_SECURE=0", "env cookie secure"),
    ]:
        require(env_example, token, label)

    if '"dbUrl":' in backend:
        raise AssertionError("public runtime metadata must not expose a database URL or local filesystem path")


if __name__ == "__main__":
    main()

