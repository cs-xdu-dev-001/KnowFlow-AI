import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { KnowFlowLogo } from "./KnowFlowLogo.jsx";

export function AuthScreen() {
  const { authenticated, loading, login, oauthProviders, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [authMessages, setAuthMessages] = useState({ login: "", register: "" });
  const [submitting, setSubmitting] = useState("");
  const isLogin = mode === "login";
  const authRequired = !loading && !authenticated;
  const authScreenClassName = authRequired ? "auth-screen" : "auth-screen hidden";
  const github = oauthProviders?.github || {};
  const githubEnabled = Boolean(github.enabled);
  const callbackUrl = github.callbackUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/oauth/github/callback`;

  const notifyLegacy = (eventName, detail = {}) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  };

  const setAuthMessage = (target, message) => {
    setAuthMessages((current) => ({ ...current, [target]: message }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting("login");
    setAuthMessage("login", "");
    try {
      const data = await login({
        account: String(formData.get("account") || ""),
        password: String(formData.get("password") || ""),
      });
      notifyLegacy("knowflow:react-auth-success", { user: data?.user, message: "登录成功" });
      form.reset();
    } catch (error) {
      setAuthMessage("login", error.message || "登录失败，请检查账号和密码");
    } finally {
      setSubmitting("");
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting("register");
    setAuthMessage("register", "");
    try {
      const data = await register({
        username: String(formData.get("username") || ""),
        email: String(formData.get("email") || ""),
        displayName: String(formData.get("displayName") || ""),
        password: String(formData.get("password") || ""),
      });
      notifyLegacy("knowflow:react-auth-success", { user: data?.user, message: "账号已创建" });
      form.reset();
    } catch (error) {
      setAuthMessage("register", error.message || "注册失败，请检查输入信息");
    } finally {
      setSubmitting("");
    }
  };

  const handleGithubLogin = () => {
    if (githubEnabled) {
      window.location.href = "/api/auth/oauth/github/start";
      return;
    }
    notifyLegacy("knowflow:react-toast", { message: "GitHub OAuth 尚未配置，请先在后端 .env 填写 Client ID 和 Secret" });
  };

  const handleCopyGithubCallback = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      notifyLegacy("knowflow:react-toast", { message: "GitHub 回调地址已复制" });
    } catch {
      notifyLegacy("knowflow:react-toast", { message: callbackUrl });
    }
  };

  useEffect(() => {
    document.body.classList.toggle("auth-required", authRequired);
    document.querySelector("#app-shell")?.classList.toggle("auth-locked", authRequired);
  }, [authRequired]);

  return (
    <section className={authScreenClassName} id="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            <KnowFlowLogo />
          </div>
          <div>
            <span className="eyebrow">KNOWFLOW AI</span>
            <h1>登录到你的知识工作台</h1>
            <p>继续管理知识库、模型配置和历史对话。使用本地账号登录，或通过 GitHub 授权进入。</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={isLogin ? "active" : ""} type="button" data-auth-mode="login" onClick={() => setMode("login")}>
            登录
          </button>
          <button className={!isLogin ? "active" : ""} type="button" data-auth-mode="register" onClick={() => setMode("register")}>
            注册
          </button>
        </div>

        <form className={isLogin ? "auth-form" : "auth-form hidden"} id="login-form" onSubmit={handleLogin}>
          <div className={authMessages.login ? "auth-message" : "auth-message hidden"} id="auth-login-message" role="alert">
            {authMessages.login}
          </div>
          <label>
            账号或邮箱<input name="account" autoComplete="username" placeholder="输入用户名或邮箱" required />
          </label>
          <label>
            密码<input name="password" type="password" autoComplete="current-password" placeholder="输入密码" required />
          </label>
          <button type="submit" disabled={submitting === "login"}>{submitting === "login" ? "登录中..." : "登录"}</button>
        </form>

        <form className={isLogin ? "auth-form hidden" : "auth-form"} id="register-form" onSubmit={handleRegister}>
          <div className={authMessages.register ? "auth-message" : "auth-message hidden"} id="auth-register-message" role="alert">
            {authMessages.register}
          </div>
          <label>
            用户名<input name="username" autoComplete="username" placeholder="设置用户名" required />
          </label>
          <label>
            邮箱<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
          </label>
          <label>
            显示名称<input name="displayName" autoComplete="name" placeholder="可选，用于侧边栏显示" />
          </label>
          <label>
            密码<input name="password" type="password" autoComplete="new-password" placeholder="至少 6 位字符" required />
          </label>
          <button type="submit" disabled={submitting === "register"}>{submitting === "register" ? "创建中..." : "创建账号"}</button>
        </form>

        <div className="auth-divider">
          <span>或</span>
        </div>
        <button
          className="auth-provider-button"
          id="github-login-btn"
          type="button"
          disabled={!githubEnabled}
          onClick={handleGithubLogin}
          title={githubEnabled ? "使用 GitHub 授权继续" : "GitHub 登录暂未配置"}
        >
          <span>GH</span>
          <strong>使用 GitHub 继续</strong>
        </button>
        <p className="auth-hint" id="auth-hint">
          {githubEnabled ? "GitHub 授权仅用于登录，不会访问你的仓库内容。" : "GitHub 登录暂未启用，你可以使用本地账号登录。"}
        </p>
        <details className={githubEnabled ? "oauth-callback-box hidden" : "oauth-callback-box"} id="oauth-callback-box">
          <summary>开发者配置</summary>
          <div className="oauth-callback-row">
            <span>GitHub OAuth 回调地址</span>
            <code id="github-callback-url">{callbackUrl}</code>
                <button id="copy-github-callback-btn" type="button" onClick={handleCopyGithubCallback}>
              复制
            </button>
          </div>
        </details>
      </div>
    </section>
  );
}
