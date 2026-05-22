import { AuthScreen } from "./components/AuthScreen.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { ChatPage } from "./components/ChatPage.jsx";
import { KnowledgePage } from "./components/KnowledgePage.jsx";
import { SettingsPage } from "./components/SettingsPage.jsx";
import { Toast } from "./components/Toast.jsx";
import { KnowFlowController } from "./components/KnowFlowController.jsx";

function WorkbenchShell() {
  return (
    <>
      <a className="skip-link" href="#main-stage">
        跳到主内容
      </a>
      <AuthScreen />
      <div className="app-shell" id="app-shell">
        <Sidebar />
        <main className="main-stage" id="main-stage" tabIndex={-1}>
          <ChatPage />
          <KnowledgePage />
          <SettingsPage />
        </main>
      </div>
      <Toast />
      <KnowFlowController />
    </>
  );
}

export default function App() {
  return <WorkbenchShell />;
}
