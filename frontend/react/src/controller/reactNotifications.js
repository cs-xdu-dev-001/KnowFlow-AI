export function notifyReactModelOptionsUpdated(models, selectedModelId = "", selectedEmbeddingModelId = "") {
  window.dispatchEvent(
    new CustomEvent("knowflow:react-model-options-updated", {
      detail: {
        models,
        selectedModelId,
        selectedEmbeddingModelId,
      },
    }),
  );
  return true;
}

export function notifyReactKnowledgeOptionsUpdated(knowledgeBases, selectedKnowledgeBaseId = null, selections = {}) {
  window.dispatchEvent(
    new CustomEvent("knowflow:react-knowledge-options-updated", {
      detail: {
        knowledgeBases,
        selectedKnowledgeBaseId,
        ...selections,
      },
    }),
  );
  return true;
}

export function notifyReactModelSelectionUpdated(selectedModelId = "") {
  window.dispatchEvent(new CustomEvent("knowflow:react-model-selection-updated", { detail: { selectedModelId } }));
  return true;
}

export function notifyReactKnowledgeSelectionUpdated(selectedKnowledgeBaseId = undefined, selections = {}) {
  const detail = { ...selections };
  if (selectedKnowledgeBaseId !== undefined) {
    detail.selectedKnowledgeBaseId = selectedKnowledgeBaseId;
  }
  window.dispatchEvent(new CustomEvent("knowflow:react-knowledge-selection-updated", { detail }));
  return true;
}

export function notifyReactAuthStateUpdated({ authenticated = false, user = null, oauthProviders = {} } = {}) {
  window.dispatchEvent(
    new CustomEvent("knowflow:react-auth-state-updated", {
      detail: {
        authenticated,
        user: user || null,
        oauthProviders: oauthProviders || {},
      },
    }),
  );
  return true;
}

export function toast(message, duration = 2400, tone = "neutral") {
  window.dispatchEvent(new CustomEvent("knowflow:react-toast", { detail: { message, duration, tone } }));
}
