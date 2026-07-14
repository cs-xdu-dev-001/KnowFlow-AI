export function createAuthFlow({ state, notifyReactAuthStateUpdated }) {
  function showAuthScreen(providers = state.oauthProviders) {
    state.oauthProviders = providers || state.oauthProviders || {};
    notifyReactAuthStateUpdated({ authenticated: false, user: null, oauthProviders: state.oauthProviders });
  }

  function showAppScreen() {
    notifyReactAuthStateUpdated({ authenticated: Boolean(state.currentUser), user: state.currentUser, oauthProviders: state.oauthProviders });
  }

  function renderCurrentUser() {
    notifyReactAuthStateUpdated({ authenticated: Boolean(state.currentUser), user: state.currentUser, oauthProviders: state.oauthProviders });
  }

  async function checkAuth() {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    const payload = await response.json();
    const data = payload.data || {};
    state.oauthProviders = data.oauthProviders || {};
    if (!data.authenticated) {
      showAuthScreen(state.oauthProviders);
      return false;
    }
    state.currentUser = data.user;
    renderCurrentUser();
    showAppScreen();
    return true;
  }

  return {
    checkAuth,
    renderCurrentUser,
    showAppScreen,
    showAuthScreen,
  };
}