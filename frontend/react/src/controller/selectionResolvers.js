function hasModelConfig(models, modelId, modelType = null) {
  if (modelId === null || modelId === undefined || modelId === "") return false;
  return models.some((model) => {
    if (String(model.id) !== String(modelId)) return false;
    return modelType ? model.modelType === modelType : true;
  });
}

export function resolveChatModelConfigId(models, preferredId = "") {
  if (hasModelConfig(models, preferredId, "chat")) return String(preferredId);
  const chatModel = models.find((model) => model.modelType === "chat") || models[0];
  return chatModel?.id ? String(chatModel.id) : "";
}

export function resolveEmbeddingModelConfigId(models, preferredId = "") {
  if (hasModelConfig(models, preferredId, "embedding")) return String(preferredId);
  const embeddingModel = models.find((model) => model.modelType === "embedding") || models[0];
  return embeddingModel?.id ? String(embeddingModel.id) : "0";
}

function hasKnowledgeBase(knowledgeBases, knowledgeBaseId) {
  return knowledgeBases.some((kb) => String(kb.id) === String(knowledgeBaseId ?? ""));
}

export function resolveKnowledgeBaseId(knowledgeBases, preferredId = null) {
  if (!knowledgeBases.length) return null;
  if (preferredId !== null && preferredId !== undefined && preferredId !== "" && hasKnowledgeBase(knowledgeBases, preferredId)) {
    return preferredId;
  }
  return knowledgeBases[0]?.id || null;
}

export function resolveChatKnowledgeBaseId(knowledgeBases, preferredId = "") {
  if (!preferredId) return "";
  return hasKnowledgeBase(knowledgeBases, preferredId) ? preferredId : "";
}