import { useState } from "react";
import { providerCards } from "../data/settings.js";

export function ModelProviderSelector() {
  const [selectedProvider, setSelectedProvider] = useState("deepseek");

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    window.dispatchEvent(new CustomEvent("knowflow:react-provider-change", { detail: { provider } }));
  };

  return (
    <div className={"provider-grid"} id={"provider-grid"}>
      {providerCards.map((provider) => (
        <button
          key={provider.key}
          className={selectedProvider === provider.key ? "provider-card selected" : "provider-card"}
          type={"button"}
          data-provider={provider.key}
          onClick={() => handleProviderSelect(provider.key)}
        >
          {provider.label}
        </button>
      ))}
    </div>
  );
}
