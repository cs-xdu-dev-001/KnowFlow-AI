import { useEffect, useState } from "react";

const modelTypeLabels = {
  chat: "对话模型",
  embedding: "向量化模型",
  rerank: "重排模型",
};

const statusLabels = {
  available: "可用",
  unavailable: "不可用",
  untested: "未测试",
};

const providerLabels = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  kimi: "Kimi",
  siliconflow: "硅基流动",
  zhipu: "智谱 AI",
  ollama: "Ollama",
  custom: "自定义",
};

export function ModelListPanel() {
  const [models, setModels] = useState([]);

  useEffect(() => {
    const handleModelsUpdated = (event) => {
      setModels(Array.isArray(event.detail?.models) ? event.detail.models : []);
    };
    window.addEventListener("knowflow:legacy-models-updated", handleModelsUpdated);
    return () => window.removeEventListener("knowflow:legacy-models-updated", handleModelsUpdated);
  }, []);

  const handleModelAction = (eventName, modelId) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { modelId } }));
  };

  return (
    <section className={"panel"}>
      <div className={"panel-title"}>
        <h2>{"模型列表"}</h2>
        <p>{"测试连接、设置默认模型或编辑配置。"}</p>
      </div>
      <div className={"list"} id={"model-list"}>
        {models.length ? (
          models.map((model) => {
            const provider = providerLabels[model.provider] || model.provider;
            const statusClass = model.status === "available" ? "ok" : model.status === "unavailable" ? "warn" : "";
            return (
              <article className={"item"} key={model.id}>
                <div className={"item-head"}>
                  <div>
                    <h3>{model.name}</h3>
                    <p>{`${provider} / ${modelTypeLabels[model.modelType] || model.modelType} / ${model.modelName}`}</p>
                    <p>
                      {"密钥 "}
                      {model.apiKeyMasked || "未配置"}
                      {" · "}
                      <span className={["badge", statusClass].filter(Boolean).join(" ")}>{statusLabels[model.status] || model.status}</span>
                      {model.isDefault ? <span className={"badge ok"}>{"默认"}</span> : null}
                    </p>
                  </div>
                  <div className={"actions"}>
                    <button type={"button"} onClick={() => handleModelAction("knowflow:react-model-edit", model.id)}>
                      {"编辑"}
                    </button>
                    <button type={"button"} onClick={() => handleModelAction("knowflow:react-model-test", model.id)}>
                      {"测试"}
                    </button>
                    <button type={"button"} onClick={() => handleModelAction("knowflow:react-model-default", model.id)}>
                      {"默认"}
                    </button>
                    <button className={"danger"} type={"button"} onClick={() => handleModelAction("knowflow:react-model-delete", model.id)}>
                      {"删除"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className={"empty-state"}>{"还没有模型配置。先添加一个 DeepSeek、OpenAI 或 MiMo 模型。"}</p>
        )}
      </div>
    </section>
  );
}
