import { ModelConfigForm } from "./ModelConfigForm.jsx";
import { ModelListPanel } from "./ModelListPanel.jsx";
import { SettingsHeader } from "./SettingsHeader.jsx";
import { SettingsSidePanel } from "./SettingsSidePanel.jsx";

export function SettingsPage() {
  return (
    <section className={"page"} id={"page-settings"}>
      <div className={"workspace-page"}>
        <SettingsHeader />
        <div className={"settings-grid"}>
          <section className={"settings-main"}>
            <ModelConfigForm />
            <ModelListPanel />
          </section>
          <SettingsSidePanel />
        </div>
      </div>
    </section>
  );
}
