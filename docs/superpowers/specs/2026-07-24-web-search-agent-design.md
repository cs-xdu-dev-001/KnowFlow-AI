# Web Search Agent设计

## 目标

为KnowFlow AI补齐第一个真正的原生tool calling闭环。聊天模型在每轮对话中自行判断是否调用`web_search`；后端执行联网搜索，将结构化结果回填模型，再由模型生成带来源链接的最终回答。

本次实现同时为后续向Hermes Agent式架构演进建立最小内核：统一Agent循环、工具注册与执行、可替换的模型和搜索供应商，以及可实时回放的Agent运行过程。

## 范围

本次只新增一个只读工具`web_search`，首个搜索供应商使用Tavily。不引入厂商SDK，不新增memory、skills、MCP、多Agent、通用网页抓取或新的数据库引用实体。运行图允许显示这些未来节点类型，但本次不实现对应执行能力。

现有知识库RAG流程继续工作。`web_search`负责外部实时信息，是否调用由模型通过`tool_choice: "auto"`决定。

每个登录用户在设置页保存自己的Tavily API Key。密钥按用户隔离并加密存储，不使用全局Tavily Key。

## 架构

### Agent循环

新增独立Agent运行器，职责仅包括：

1. 将消息和已启用工具schema交给模型网关。
2. 读取模型返回的文本或结构化`tool_calls`。
3. 校验并执行工具调用。
4. 将assistant工具请求和tool结果追加到消息历史。
5. 再次请求模型，直到返回最终文本或达到最多3轮工具调用。

Agent运行器不依赖Tavily，也不直接包含具体工具实现。

Agent运行器必须在实际工作边界产生结构化运行事件，不能先完成全部工作再伪流式回放。模型调用开始、工具调用开始、工具返回、错误、重试和最终回答都在发生时立即向SSE写入事件。

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

### 用户级工具配置

新增通用`tool_config`表，而不是将工具配置混入`model_config`或为Tavily建立专用表。第一版字段为：

```text
id
user_id
tool_name
provider
api_key_cipher
enabled
created_at
updated_at
```

`user_id + tool_name`保持唯一。所有读取、更新、测试和删除操作必须同时匹配当前登录用户。API Key复用现有Fernet加密机制，响应只返回掩码；更新时空Key表示保留原密钥。

第一版提供通用接口：

```text
GET    /api/tool-configs
PUT    /api/tool-configs/web_search
POST   /api/tool-configs/web_search/test
DELETE /api/tool-configs/web_search
```

只有当前用户已配置并启用`web_search`时，Agent运行器才把该工具schema交给模型。

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

Tavily API Key从当前用户的加密工具配置中读取，解密只发生在后端执行搜索时。请求设置独立超时，并限制查询长度、结果数量和回填模型的总文本长度。以后接入Brave时只需新增Provider实现。

### 设置页

现有设置页新增“工具配置”区域，第一项为“联网搜索”。沿用模型配置已有的表单、密码输入、密钥掩码、保存和检查交互，不新增独立说明段落。

用户可以启用或停用工具、保存新Key、检查连接和清除配置。供应商第一版固定显示为Tavily，不开放无效选项。检查连接执行一次最小搜索并明确标注会消耗1credit。

### 结构化运行事件

前端不读取或解析后端日志。Agent运行器通过独立事件发射器产生面向产品展示的脱敏事件，后端普通日志继续只用于开发排错。

单个步骤事件至少包含：

```json
{
  "runId": "run_7H3K",
  "stepId": "step_3",
  "parentId": "step_1",
  "kind": "tool",
  "name": "web_search",
  "status": "running",
  "title": "正在联网搜索",
  "inputSummary": "搜索Agent执行流图案例",
  "outputSummary": null,
  "startedAt": "2026-07-24T13:00:00Z",
  "durationMs": null
}
```

`kind`预留以下稳定枚举：

```text
model
tool
mcp
skill
agent
system
approval
```

本次实际产生`model`、`tool`和`system`节点。`mcp`、`skill`、`agent`、`approval`只作为前端可识别的未来类型，不提供伪执行。

`status`只允许：

```text
waiting
running
success
failed
cancelled
```

同一`stepId`可以先发送`running`，完成后再发送`success`或`failed`。前端按`stepId`合并更新，而不是追加重复节点。`parentId`形成通用树结构，未来并行工具和嵌套Skill不需要更换协议。

事件只能包含公开步骤信息和脱敏摘要，不得包含隐藏思维链、系统提示词、完整模型上下文、API Key、认证头、Cookie或未截断的工具原始输出。错误只发送稳定错误码和用户可读摘要，不发送堆栈。

### 实时传输与回放

沿用现有SSE接口，不新增WebSocket。回答文本与运行事件共用一条连接，事件顺序示例：

```text
agent_step(running)
agent_step(success)
agent_step(running)
message(answer delta)
agent_step(success)
reference
done
```

连接中断时，前端将仍为`running`的节点标记为`failed`并提供重试入口。后端完成运行后，将最终脱敏事件数组作为`trace_json`快照随assistant消息保存。`chat_message`增加可空`trace_json TEXT`字段，不新增运行日志表。

现有`agent_tool_call`继续保存工具审计详情并关联`message_id`；`trace_json`只保存前端展示所需的紧凑快照。读取会话历史时返回解析后的`trace`，刷新后可恢复完整流图。旧消息没有`trace_json`时正常显示，不构造虚假步骤。

### 前端运行图

采用已确认的混合式布局：

- 聊天主区在assistant消息顶部显示紧凑状态条，只呈现当前步骤、路径、耗时和“查看过程”入口。
- 桌面端右侧抽屉显示完整层级流图；移动端使用全宽底部面板。
- 当前节点使用呼吸高亮，成功为绿色，失败为红色，等待为灰色，需要确认预留黄色。
- 点击节点只显示公开输入、结果摘要、耗时和错误摘要。
- 多个同级工具按分支展示；Skill、MCP和子Agent以后可使用相同`parentId`协议嵌套。
- 运行完成后状态条收起为摘要，用户可再次展开回放。

动画只改变`transform`和`opacity`，尊重`prefers-reduced-motion`。状态不能只靠颜色表达，节点同时显示图标和文本。聊天主区不因抽屉开关改变消息内容宽度到不可读。

## 请求流程

1. 前端发送普通聊天请求。
2. 后端读取当前用户已启用的工具配置，准备现有会话上下文和可选知识库RAG上下文。
3. 如果`web_search`已配置并启用，Agent运行器以`tool_choice: "auto"`把工具schema交给模型。
4. 模型可直接回答，也可返回一个或多个`web_search`调用。
5. 后端解密当前用户的Tavily Key并执行搜索，记录工具名称、参数、状态、耗时和结构化结果。
6. 搜索结果以`tool`消息回填模型。
7. 模型生成最终回答，引用搜索结果中的原始URL。
8. Agent运行器在每个真实执行边界发送`agent_step`事件，前端实时点亮状态条和右侧流图。
9. 最终回答继续走现有消息增量事件，引用继续走`reference`事件。
10. 完成后将脱敏运行快照写入assistant消息，刷新后可以回放。

第一版不把Web结果写入只支持本地文档外键的`message_reference`表，避免为单个工具提前扩展数据库实体。来源链接保留在最终回答和工具调用记录中。

## 错误处理

- 未配置、已停用或已清除Tavily Key：不向模型暴露`web_search`。
- 搜索超时：工具返回`web_search_timeout`。
- Tavily非成功响应或响应格式异常：工具返回可供模型解释的结构化错误，日志不包含API Key。
- 模型返回未知工具或无效参数：拒绝执行，并将错误作为tool结果回填。
- 超过3轮：终止循环并返回明确错误，防止无限调用。
- 用户尝试读取、修改、测试或删除他人的配置：按不存在处理，不泄露记录状态。
- SSE连接异常：前端结束运行态并将未完成步骤标记为失败，不永久显示加载动画。
- 运行事件构造异常：不影响Agent主流程，记录服务端错误并发送最小`system`失败节点。
- 工具输入、输出和异常在进入事件或持久化快照前统一脱敏和截断。

## 配置

用户在设置页配置Tavily API Key和启用状态。新增的服务端运行参数为：

```text
KNOWFLOW_WEB_SEARCH_TIMEOUT=15
KNOWFLOW_WEB_SEARCH_MAX_RESULTS=5
```

配置示例和README说明不得包含真实Key。前端提交Key后不能再次读取明文，搜索供应商凭证也不能出现在日志、工具结果或聊天上下文中。

## 测试

所有自动化测试禁止访问外网，使用假模型响应和假HTTP transport覆盖：

- 模型不请求工具时直接返回答案。
- 模型请求`web_search`后，工具结果正确回填并触发第二次模型调用。
- Tavily请求头、URL、参数和结果标准化正确。
- 工具配置按用户隔离、密钥加密且API响应仅返回掩码。
- 设置页能够保存、启停、检查和清除当前用户的Tavily配置。
- 未配置或已停用时，模型请求中不包含`web_search`工具。
- 未配置Key、超时、异常响应、未知工具和无效参数返回预期错误。
- Agent循环达到上限时终止。
- 现有非Agent聊天和RAG路径保持兼容。
- `agent_step`在真实模型和工具执行边界按`running`、`success`或`failed`顺序产生。
- 事件不包含密钥、认证头、系统提示词、隐藏思维链或错误堆栈。
- 前端按`stepId`合并状态，并继续处理`tool`、`answer`、`reference`和`done`事件。
- 状态条能显示当前步骤，右侧抽屉能显示层级流图和节点详情。
- 多工具并行、MCP、Skill和子Agent的模拟事件能够通过同一组件正确渲染。
- 断流时不会永久停留在`running`状态。
- 完成后的`trace_json`可随历史消息读取，旧消息保持兼容。
- `prefers-reduced-motion`下禁用呼吸动画，键盘可以打开抽屉并选择节点。

## 验收标准

- 使用支持OpenAI兼容tool calling的模型询问实时信息时，模型能够自主调用`web_search`。
- 普通知识问题可以直接回答，不产生搜索请求。
- 每个登录用户只能配置和使用自己的Tavily API Key。
- 设置页可以保存、检查、启停和清除联网搜索配置，且永不回显完整Key。
- 最终回答包含可点击的来源URL，前端能看到工具调用过程。
- Agent工作时，主区能实时显示当前步骤，右侧流图准确点亮执行位置。
- 刷新会话后，已完成回答的运行图可以回放。
- 流图展示公开执行事实，不泄露隐藏思维链或凭证。
- 普通工具、未来MCP、Skill和子Agent共享同一节点协议，新增类型不需要重写流图。
- 搜索供应商可通过内部接口替换，不影响Agent循环。
- 所有`tests/check_*.py`、前端构建和`git diff --check`通过。
