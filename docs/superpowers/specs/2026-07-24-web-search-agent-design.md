# Web Search Agent设计

## 目标

为KnowFlow AI补齐第一个真正的原生tool calling闭环。聊天模型在每轮对话中自行判断是否调用`web_search`；后端执行联网搜索，将结构化结果回填模型，再由模型生成带来源链接的最终回答。

本次实现同时为后续向Hermes Agent式架构演进建立最小内核：统一Agent循环、工具注册与执行、可替换的模型和搜索供应商，以及可观察的工具调用过程。

## 范围

本次只新增一个只读工具`web_search`，首个搜索供应商使用Tavily。不引入厂商SDK，不新增memory、skills、MCP、多Agent、通用网页抓取或新的数据库引用实体。

现有知识库RAG流程继续工作。`web_search`负责外部实时信息，是否调用由模型通过`tool_choice: "auto"`决定。

## 架构

### Agent循环

新增独立Agent运行器，职责仅包括：

1. 将消息和已启用工具schema交给模型网关。
2. 读取模型返回的文本或结构化`tool_calls`。
3. 校验并执行工具调用。
4. 将assistant工具请求和tool结果追加到消息历史。
5. 再次请求模型，直到返回最终文本或达到最多3轮工具调用。

Agent运行器不依赖Tavily，也不直接包含具体工具实现。

### 模型网关

沿用现有`requests`和OpenAI兼容`/chat/completions`接口，不引入OpenAI、Tavily或其他厂商SDK。

模型网关增加返回完整assistant消息的能力，并支持可选的`tools`与`tool_choice`请求字段。现有只返回文本的聊天方法保持兼容，普通RAG问答无需改成Agent模式。

如果模型或兼容网关拒绝工具字段，系统返回明确的工具能力错误，不退化为每次强制搜索。

### 工具注册与执行

工具注册表保存以下信息：

- 工具名称、说明和JSON Schema。
- 对应的后端执行函数。
- `read_only`、超时等运行元数据。

执行器只允许调用已注册并启用的工具。未知工具、无效JSON和不符合schema的参数均转成结构化工具错误，不执行外部请求。

### Web搜索供应商

定义内部`WebSearchProvider`边界，Tavily作为首个实现。业务侧统一调用：

```python
search(query: str, top_k: int = 5) -> list[SearchResult]
```

统一结果包含：

```json
{
  "title": "页面标题",
  "url": "https://example.com",
  "snippet": "与查询相关的摘要",
  "score": 0.91,
  "published_at": null
}
```

Tavily API Key仅从后端环境变量读取。请求设置独立超时，并限制查询长度、结果数量和回填模型的总文本长度。以后接入Brave时只需新增Provider实现。

## 请求流程

1. 前端发送普通聊天请求，并默认启用`web_search`能力。
2. 后端准备现有会话上下文和可选知识库RAG上下文。
3. Agent运行器以`tool_choice: "auto"`调用模型。
4. 模型可直接回答，也可返回一个或多个`web_search`调用。
5. 后端执行搜索，记录工具名称、参数、状态、耗时和结构化结果。
6. 搜索结果以`tool`消息回填模型。
7. 模型生成最终回答，引用搜索结果中的原始URL。
8. 现有SSE工具事件将调用过程展示在前端；最终回答仍走现有消息流。

第一版不把Web结果写入只支持本地文档外键的`message_reference`表，避免为单个工具提前扩展数据库实体。来源链接保留在最终回答和工具调用记录中。

## 错误处理

- 未配置Tavily Key：工具返回`web_search_not_configured`。
- 搜索超时：工具返回`web_search_timeout`。
- Tavily非成功响应或响应格式异常：工具返回可供模型解释的结构化错误，日志不包含API Key。
- 模型返回未知工具或无效参数：拒绝执行，并将错误作为tool结果回填。
- 超过3轮：终止循环并返回明确错误，防止无限调用。

## 配置

新增后端配置：

```text
KNOWFLOW_WEB_SEARCH_PROVIDER=tavily
KNOWFLOW_TAVILY_API_KEY=
KNOWFLOW_WEB_SEARCH_TIMEOUT=15
KNOWFLOW_WEB_SEARCH_MAX_RESULTS=5
```

配置示例和README说明不得包含真实Key。前端不接触搜索供应商凭证。

## 测试

所有自动化测试禁止访问外网，使用假模型响应和假HTTP transport覆盖：

- 模型不请求工具时直接返回答案。
- 模型请求`web_search`后，工具结果正确回填并触发第二次模型调用。
- Tavily请求头、URL、参数和结果标准化正确。
- 未配置Key、超时、异常响应、未知工具和无效参数返回预期错误。
- Agent循环达到上限时终止。
- 现有非Agent聊天和RAG路径保持兼容。
- 前端能够构建，并继续处理`tool`、`answer`、`reference`和`done`事件。

## 验收标准

- 使用支持OpenAI兼容tool calling的模型询问实时信息时，模型能够自主调用`web_search`。
- 普通知识问题可以直接回答，不产生搜索请求。
- 最终回答包含可点击的来源URL，前端能看到工具调用过程。
- 搜索供应商可通过内部接口替换，不影响Agent循环。
- 所有`tests/check_*.py`、前端构建和`git diff --check`通过。
