import { providerCards } from "../data/settings.js";

export function ModelProviderSelector({ selectedProvider = "deepseek", onProviderSelect }) {
  const handleProviderSelect = (provider) => {
    onProviderSelect?.(provider);
  };

  return (
    <div className={"provider-grid"} id={"provider-grid"}>
      {providerCards.map((provider) => (
        <button
          key={provider.key}
          className={selectedProvider === provider.key ? "provider-card selected" : "provider-card"}
          type={"button"}
          data-provider={provider.key}
          aria-pressed={selectedProvider === provider.key}
          aria-label={`选择${provider.name}`}
          onClick={() => handleProviderSelect(provider.key)}
        >
          <strong>{provider.name}</strong>
        </button>
      ))}
    </div>
  );
}
