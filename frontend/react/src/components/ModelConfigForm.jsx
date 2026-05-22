import { ModelProviderSelector } from "./ModelProviderSelector.jsx";

export function ModelConfigForm() {
  const handleModelProviderInput = (event) => {
    window.dispatchEvent(
      new CustomEvent("knowflow:react-model-provider-input", {
        detail: { value: event.target.value || "" },
      }),
    );
  };

  const handleModelPresetChange = (event) => {
    window.dispatchEvent(
      new CustomEvent("knowflow:react-model-preset-change", {
        detail: { value: event.target.value || "" },
      }),
    );
  };

  const handleModelCancel = () => {
    window.dispatchEvent(new CustomEvent("knowflow:react-model-cancel"));
  };

  const handleModelSubmit = (event) => {
    event.preventDefault();
    window.dispatchEvent(
      new CustomEvent("knowflow:react-model-submit", {
        detail: { form: event.currentTarget },
      }),
    );
  };

  return (
    <form className={"panel stack-form"} id={"model-form"} onSubmit={handleModelSubmit}>
      <div className={"panel-title"}>
        <h2 id={"model-form-title"}>{"新增模型配置"}</h2>
        <p>{"预设供应商可自动填充 Base URL 和常用模型；第三方接口可选择自定义后手动填写。"}</p>
      </div>
      <ModelProviderSelector />
      <div className={"form-grid"}>
        <label>
          {"配置名称"}
          <input name={"name"} defaultValue={"DeepSeek 对话模型"} required />
        </label>
        <label>
          {"常用模型"}
          <select id={"model-preset-select"} onChange={handleModelPresetChange}></select>
        </label>
        <label>
          {"供应商标识"}
          <input
            name={"provider"}
            id={"model-provider"}
            defaultValue={"deepseek"}
            placeholder={"如 openai、newapi、oneapi、siliconflow"}
            required
            onInput={handleModelProviderInput}
          />
        </label>
        <label>
          {"模型用途"}
          <select name={"modelType"}>
            <option value={"chat"}>{"对话模型"}</option>
            <option value={"embedding"}>{"向量化模型"}</option>
            <option value={"rerank"}>{"重排模型"}</option>
          </select>
        </label>
        <label>
          {"模型名称"}
          <input name={"modelName"} defaultValue={"deepseek-chat"} required />
        </label>
        <label className={"wide"}>
          {"接口地址"}
          <input name={"baseUrl"} defaultValue={"https://api.deepseek.com"} required />
        </label>
        <label className={"wide"}>
          {"接口密钥"}
          <input name={"apiKey"} type={"password"} placeholder={"sk-xxx，仅后端加密保存"} />
        </label>
        <label>
          {"温度"}
          <input name={"temperature"} type={"number"} step={"0.1"} defaultValue={"0.7"} />
        </label>
        <label>
          {"采样概率"}
          <input name={"topP"} type={"number"} step={"0.1"} defaultValue={"0.9"} />
        </label>
        <label>
          {"最大输出"}
          <input name={"maxTokens"} type={"number"} defaultValue={"4096"} />
        </label>
      </div>
      <div className={"button-row"}>
        <button type={"submit"} id={"model-submit-btn"}>
          {"保存配置"}
        </button>
        <button className={"secondary-button"} type={"button"} id={"model-cancel-btn"} onClick={handleModelCancel}>
          {"取消编辑"}
        </button>
      </div>
    </form>
  );
}
