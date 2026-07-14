export const providerCards = [
  { key: "deepseek", name: "DeepSeek" },
  { key: "mimo", name: "MiMo" },
  { key: "openai", name: "OpenAI" },
  { key: "siliconflow", name: "SiliconFlow" },
  { key: "zhipu", name: "智谱AI" },
  { key: "bailian", name: "百炼" },
  { key: "custom", name: "自定义" },
];

export const providerPresets = {
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    models: [
      { label: "deepseek-chat", name: "DeepSeek Chat", modelType: "chat", modelName: "deepseek-chat", temperature: "0.7", topP: "0.9", maxTokens: "4096" },
      { label: "deepseek-reasoner", name: "DeepSeek Reasoner", modelType: "chat", modelName: "deepseek-reasoner", temperature: "0.6", topP: "0.9", maxTokens: "4096" },
    ],
  },
  mimo: {
    label: "MiMo",
    baseUrl: "https://api.mimo-v2.com/v1",
    models: [
      { label: "MiMo V2 Pro", name: "MiMo V2 Pro", modelType: "chat", modelName: "mimo-v2-pro", temperature: "1.0", topP: "0.95", maxTokens: "4096" },
      { label: "MiMo V2 Flash", name: "MiMo V2 Flash", modelType: "chat", modelName: "mimo-v2-flash", temperature: "1.0", topP: "0.95", maxTokens: "4096" },
    ],
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { label: "gpt-4.1-mini", name: "GPT-4.1 Mini", modelType: "chat", modelName: "gpt-4.1-mini", temperature: "0.7", topP: "0.9", maxTokens: "4096" },
      { label: "text-embedding-3-small", name: "Text 向量化 3 Small", modelType: "embedding", modelName: "text-embedding-3-small", temperature: "", topP: "", maxTokens: "" },
    ],
  },
  siliconflow: {
    label: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    models: [
      { label: "Qwen/Qwen3-235B-A22B-Instruct-2507", name: "Qwen3 235B", modelType: "chat", modelName: "Qwen/Qwen3-235B-A22B-Instruct-2507", temperature: "0.7", topP: "0.9", maxTokens: "4096" },
      { label: "BAAI/bge-m3", name: "BGE M3 向量化", modelType: "embedding", modelName: "BAAI/bge-m3", temperature: "", topP: "", maxTokens: "" },
    ],
  },
  zhipu: {
    label: "Zhipu AI",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: [
      { label: "glm-4-flash", name: "GLM-4 Flash", modelType: "chat", modelName: "glm-4-flash", temperature: "0.7", topP: "0.9", maxTokens: "4096" },
    ],
  },
  bailian: {
    label: "Bailian",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      { label: "qwen-plus", name: "Qwen Plus", modelType: "chat", modelName: "qwen-plus", temperature: "0.7", topP: "0.9", maxTokens: "4096" },
      { label: "text-embedding-v4", name: "Bailian 向量化 V4", modelType: "embedding", modelName: "text-embedding-v4", temperature: "", topP: "", maxTokens: "" },
    ],
  },
  custom: {
    label: "Custom API",
    baseUrl: "",
    models: [],
  },
};
