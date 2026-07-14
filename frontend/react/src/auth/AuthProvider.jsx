import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [oauthProviders, setOauthProviders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getCurrentUser = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await authApi.getCurrentUser();
      setUser(data?.authenticated ? data.user : null);
      setOauthProviders(data?.oauthProviders || {});
      return data;
    } catch (apiError) {
      setUser(null);
      setError(apiError.message || "无法获取当前登录状态");
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, []);

  const applyAuthState = useCallback((event) => {
    const detail = event.detail || {};
    if (Object.prototype.hasOwnProperty.call(detail, "oauthProviders")) {
      setOauthProviders(detail.oauthProviders || {});
    }
    if (Object.prototype.hasOwnProperty.call(detail, "authenticated")) {
      setUser(detail.authenticated ? detail.user || null : null);
      setLoading(false);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(detail, "user")) {
      setUser(detail.user || null);
      setLoading(false);
    }
  }, []);

  const applyAuthRequired = useCallback((event) => {
    setUser(null);
    setLoading(false);
    setError(event.detail?.message || "请先登录。");
  }, []);

  useEffect(() => {
    getCurrentUser().catch(() => {});
  }, [getCurrentUser]);

  useEffect(() => {
    window.addEventListener("knowflow:react-auth-state-updated", applyAuthState);
    window.addEventListener("knowflow:react-auth-required", applyAuthRequired);
    return () => {
      window.removeEventListener("knowflow:react-auth-state-updated", applyAuthState);
      window.removeEventListener("knowflow:react-auth-required", applyAuthRequired);
    };
  }, [applyAuthRequired, applyAuthState]);


  const login = useCallback(
    async ({ account, password }) => {
      setError("");
      const data = await authApi.login(account, password);
      setUser(data?.user || null);
      await getCurrentUser();
      return data;
    },
    [getCurrentUser],
  );

  const register = useCallback(
    async ({ username, email, password, displayName }) => {
      setError("");
      const data = await authApi.register({ username, email, password, displayName });
      setUser(data?.user || null);
      await getCurrentUser();
      return data;
    },
    [getCurrentUser],
  );

  const logout = useCallback(async () => {
    setError("");
    await authApi.logout();
    setUser(null);
    await getCurrentUser();
  }, [getCurrentUser]);

  const value = useMemo(
    () => ({
      user,
      authenticated: Boolean(user),
      oauthProviders,
      loading,
      error,
      getCurrentUser,
      login,
      register,
      logout,
    }),
    [user, oauthProviders, loading, error, getCurrentUser, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth 必须在 AuthProvider 内使用");
  }
  return value;
}
