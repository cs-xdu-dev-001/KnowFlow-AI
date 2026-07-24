# MCP OAuth接入设计

## 目标

为KnowFlow AI增加用户级远程MCP能力，使模型可以像调用原生`web_search`一样自主选择MCP工具。第一版内置Notion连接入口，并允许用户添加自定义远程MCP服务器。

Notion通过官方托管端点`https://mcp.notion.com/mcp`连接，使用OAuth授权。读取操作可以自动执行；写入、删除以及风险未知的操作必须暂停Agent运行并等待当前用户确认。MCP连接、工具调用、等待确认和执行结果均通过现有Agent运行流图实时展示。

本设计建立远程MCP的通用边界，不把Agent循环绑定到Notion。后续增加更多MCP预设、Skill或其他能力类型时，继续复用ToolRegistry和结构化运行事件。

## 范围

第一版包含：

- 远程Streamable HTTP MCP客户端。
- Notion官方托管MCP预设。
- 自定义远程MCP服务器。
- OAuth 2.1发现、PKCE、动态客户端注册和Token刷新。
- 无鉴权及静态Header鉴权。
- 用户级加密凭据和严格的数据隔离。
- MCP工具发现、逐工具启停和Agent自动选择。
- 读取自动执行，写入、删除和风险未知调用等待人工确认。
- 设置页连接管理、工具目录及运行流图实时状态。

第一版不包含：

- 本地stdio MCP或启动本地子进程。
- MCP市场和第三方模板库；内置预设只有Notion。
- 永久放行写操作或复杂权限策略。
- 多Agent和Skill执行器。
- 后端重启后的Agent断点恢复。
- 跨进程审批协调；第一版部署保持单个后端进程。
- 将全部MCP工具按独立数据库记录持久化。
- 无标准OAuth发现且需要厂商专用流程的适配器。

## 架构决策

### 后端内嵌MCP客户端

MCP能力直接集成到现有Python后端，不新增独立网关。协议会话层使用官方MCP Python SDK处理Streamable HTTP、`initialize`、`tools/list`和`tools/call`，KnowFlow负责用户鉴权、OAuth状态、凭据持久化、工具筛选、风险审批和运行事件。

如果SDK的OAuth辅助层不能接入现有数据库，KnowFlow只自行编排OAuth发现、PKCE和Token持久化，不重新实现MCP JSON-RPC协议。

浏览器不直接连接MCP服务器。所有Token、Header、工具schema和工具调用都经过KnowFlow后端，避免凭据暴露、CORS差异以及不同服务器实现污染前端。

### 复用现有Agent内核

MCP工具适配为现有ToolRegistry可执行工具，AgentRunner仍然只处理：

1. 将当前用户可用的工具schema交给模型。
2. 接收结构化`tool_calls`。
3. 通过注册表校验并执行工具。
4. 将工具结果回填模型。
5. 循环到最终回答或达到上限。

MCP不会建立第二套Agent循环。`web_search`等原生工具与MCP工具可以出现在同一次运行中。

### 会话生命周期

设置页连接或刷新工具时建立短会话，完成`initialize`和`tools/list`后关闭。

聊天运行只根据数据库中的工具目录快照构造模型schema。模型第一次选择某个MCP服务器的工具时，后端为本次Agent运行建立远程会话；同一运行内复用该会话，运行结束后关闭。第一版不维护跨运行常驻连接。

## 数据模型

### `mcp_server`

每条记录只属于一个登录用户：

```text
id
user_id
name
slug
url
auth_type
enabled
status
credentials_cipher
tools_json
enabled_tools_json
last_error_code
last_connected_at
created_at
updated_at
```

约束与字段语义：

- `user_id + slug`唯一，所有读写同时匹配当前用户。
- `auth_type`只允许`none`、`headers`、`oauth`。
- `status`只允许`disconnected`、`connecting`、`connected`、`error`、`reauthorize`。
- `credentials_cipher`是使用现有Fernet机制加密的JSON整体，不拆分明文Token字段。
- OAuth凭据可以包含客户端注册信息、Access Token、Refresh Token、过期时间、授权服务器和Scope。
- 静态Header的名称和值也只存在于加密凭据中。
- `tools_json`保存最近一次成功发现的公开工具schema快照。
- `enabled_tools_json`保存用户启用的远程工具名，不为每个工具新增数据库实体。
- API响应不返回`credentials_cipher`，只返回`configured`等布尔状态。

删除用户时按现有用户数据清理机制级联删除MCP记录。删除MCP连接前，若授权服务器声明撤销端点则尽力撤销Token；无论撤销是否成功，本地加密凭据都必须删除。

### `mcp_oauth_session`

OAuth授权过程使用短期记录：

```text
id
user_id
server_id
state_hash
pkce_verifier_cipher
return_to
expires_at
created_at
```

- 只保存`state`哈希，不保存可直接使用的原值。
- PKCE Verifier使用Fernet加密。
- `return_to`必须通过现有`KNOWFLOW_OAUTH_RETURN_ORIGINS`精确origin白名单。
- 授权成功、拒绝或过期后立即删除。
- 定期清理过期记录。

工具目录继续使用JSON快照。只有以后需要工具级角色授权、调用统计或独立版本管理时，才考虑拆出工具表。

## OAuth流程

### Notion预设

1. 用户在“工具与MCP”页面点击“连接Notion”。
2. 后端创建属于当前用户的`mcp_server`待连接记录。
3. MCP客户端访问资源端点并读取受保护资源元数据及授权服务器元数据。
4. 后端在服务端生成随机`state`、PKCE Verifier和S256 Challenge。
5. 授权服务器支持动态客户端注册时，注册KnowFlow回调地址；已有有效注册信息时复用。
6. 浏览器重定向到Notion授权页。
7. Notion回调到`${KNOWFLOW_BASE_URL}/api/mcp/oauth/callback`。
8. 后端要求当前登录会话仍然有效，并同时校验用户、服务器、`state`、PKCE和过期时间。
9. 后端携带资源指示符交换Token，将凭据整体加密保存。
10. 建立MCP会话并调用`initialize`、`tools/list`。
11. 保存工具目录快照，将连接状态设为`connected`。
12. 浏览器只重定向到白名单内的前端“工具与MCP”页面，并显示连接结果。

Notion预设固定使用`https://mcp.notion.com/mcp`和OAuth，不提供普通Integration Token输入框。

### 自定义OAuth

自定义服务器优先使用标准受保护资源元数据、授权服务器元数据、PKCE S256和动态客户端注册。

如果服务器不支持动态注册，用户可以填写服务器管理员提供的Client ID和可选Client Secret。它们进入加密凭据，不回显原值。无法完成标准发现且需要专用OAuth流程的服务器显示“不兼容”，不猜测厂商端点。

OAuth发现出的授权地址、Token地址、注册地址和每次重定向都执行与MCP资源地址相同的网络安全校验。授权服务器可以与MCP资源不同域，但必须是合法公网HTTPS地址。

### Token刷新

- Access Token在到期前或收到401后刷新。
- 单次工具调用最多进行一次刷新和一次重连。
- 刷新成功后原子替换加密凭据。
- `invalid_grant`、缺少Refresh Token或刷新仍返回401时，将服务器设为`reauthorize`。
- Token和刷新错误不进入聊天上下文、SSE事件或普通日志。

## MCP服务器与工具管理

### URL安全

自定义MCP地址默认只接受HTTPS。请求前解析主机并拒绝：

- Loopback、私有、链路本地、保留及未指定地址。
- IPv4映射IPv6等可绕过文本匹配的地址形式。
- 常见云元数据地址和主机名。
- URL中的用户名或密码。

每次DNS解析、连接和重定向都重新执行策略，所有OAuth发现端点也使用同一策略。请求设置连接、读取和总时限，并限制响应头、响应体和工具结果大小。

开发环境如确需连接本机模拟MCP，只能由显式服务端环境变量开启，默认关闭，生产配置不得依赖此开关。

### 工具发现

连接、测试和“刷新工具”都会执行`initialize`和`tools/list`。只有完整成功的结果才能替换原工具快照；刷新失败时保留旧快照并把连接标记为异常。

工具目录保存：

- 原始MCP工具名。
- 说明和输入JSON Schema。
- MCP annotations，包括`readOnlyHint`和`destructiveHint`。
- 用户启用状态。

Agent只看到已启用服务器中的已启用工具。服务器被停用、删除或要求重新授权时，其工具立即从ToolRegistry消失。

为避免不同服务器工具重名，提交给模型的名称使用：

```text
mcp__{server_slug}__{tool_slug}
```

名称只保留模型工具名允许的字符，并限制总长度；超长部分使用稳定哈希后缀。运行期保存模型工具名到`server_id + 原始工具名`的映射，实际`tools/call`仍传原始名称。

第一版限制单次运行暴露的MCP工具总数。服务器工具超过限制时，用户必须在详情页选择启用工具；不静默截断。以后可以增加`tool_search`式惰性发现，不在本次实现。

## 风险判断与人工确认

### 判断规则

- 只有服务器明确声明`readOnlyHint=true`且未声明破坏性的工具可以自动执行。
- `destructiveHint=true`、明确写入或删除的工具必须确认。
- 缺少annotations、annotations冲突或风险无法判断时必须确认。
- MCP annotations仅作为服务器提供的提示；设置页明确告知用户只连接可信服务器。

用户启用工具只代表允许模型选择，不代表永久批准写入。

### 审批协调

第一版增加进程内`ApprovalBroker`，不新增审批数据库表：

1. Agent准备执行需要确认的工具时，生成不可预测的`approvalId`。
2. Broker记录`approvalId`、`user_id`、`run_id`、脱敏调用摘要、截止时间和等待事件。
3. Agent线程发出`approval_required`及`approval`类型的`waiting`节点，然后暂停。
4. 前端通过独立认证请求提交`allow_once`或`deny`。
5. Broker校验当前用户、运行和审批状态，原子地解决审批并唤醒Agent线程。
6. 允许后将节点更新为成功并开始MCP调用；拒绝后向模型回填稳定的`permission_denied`工具结果。
7. 审批过期、SSE运行取消或服务关闭时，Broker拒绝调用并清理状态。

第一版部署要求单个后端进程。多进程或可恢复执行需要把Broker迁移到共享数据库或任务队列，属于后续范围。

审批只提供“允许本次”和“拒绝”。重复写操作每次重新确认。

## API

### 服务器管理

```text
GET    /api/mcp/servers
POST   /api/mcp/servers
GET    /api/mcp/servers/{server_id}
PATCH  /api/mcp/servers/{server_id}
DELETE /api/mcp/servers/{server_id}
POST   /api/mcp/servers/{server_id}/test
POST   /api/mcp/servers/{server_id}/refresh-tools
POST   /api/mcp/servers/{server_id}/disconnect
```

`POST /api/mcp/servers`创建Notion预设或自定义服务器。Notion的名称、URL和鉴权类型由后端预设覆盖，不能通过请求替换成其他地址。

`PATCH`只允许修改名称、启用状态、工具启用列表，以及自定义服务器允许编辑的连接字段。所有接口按当前用户和`server_id`联合查询，不泄露其他用户是否存在同名或同ID记录。

### OAuth

```text
POST /api/mcp/servers/{server_id}/oauth/start
GET  /api/mcp/oauth/callback
```

`oauth/start`返回授权URL或直接重定向；前端不接触PKCE Verifier。回调是公开路由入口，但必须通过有效登录Cookie和一次性OAuth会话才能完成。

### 审批

```text
POST /api/agent/approvals/{approval_id}
```

请求体只允许：

```json
{
  "decision": "allow_once"
}
```

或：

```json
{
  "decision": "deny"
}
```

重复提交返回审批已解决，过期返回审批已失效，非所属用户按不存在处理。

## 前端交互

### 工具与MCP页面

页面保持当前“工具与MCP”工作区，包含：

```text
原生工具
  联网搜索

MCP服务器
  Notion
  自定义服务器
  + 添加服务器
```

每个服务器卡片直接显示名称、连接状态、已发现工具数和启用工具数，并提供与当前状态相符的主要操作：

- 未连接：连接。
- 已连接：测试、刷新工具、停用。
- 需要重新授权：重新授权。
- 异常：重试和查看公开错误。
- 所有自定义连接：删除。

点击卡片打开详情抽屉，工具列表展示工具名、风险标识和启用开关。核心状态和操作使用正常正文字号，不依赖小字号解释承担关键信息。

添加自定义服务器表单包含名称、URL和鉴权方式。选择OAuth时允许自动注册或填写Client ID、Client Secret；选择静态Header时支持添加多个名称和值。已经保存的Secret只显示“已配置”，编辑时留空表示保留原值。

OAuth返回设置页后，根据一次性结果参数显示成功或稳定错误码，不把Token或授权服务器原始错误内容放入URL。

### 运行流图

沿用现有`AgentRunSummary`和右侧运行抽屉。MCP调用使用`kind: "mcp"`，等待确认使用`kind: "approval"`。

示例路径：

```text
Agent开始
  → 模型判断
  → 等待确认：Notion写入
  → MCP：notion-create-pages
  → 模型整理
  → 完成
```

状态表现：

- `waiting`：灰色；审批等待使用琥珀色并显示操作按钮。
- `running`：高亮呼吸动画。
- `success`：绿色完成状态。
- `failed`：红色失败状态。
- `cancelled`：中性取消状态。

运行抽屉顶部继续显示当前进度、已用时间和工具调用次数。MCP节点计入工具调用；审批节点不计入。

点击节点只显示服务器、工具名、脱敏后的公开输入、结果摘要、耗时、风险类型和批准结果。Token、Header、Cookie、完整远程响应和隐藏模型上下文不进入前端。

审批同时出现在聊天正文和运行抽屉。关闭抽屉不会取消运行；用户停止生成时，未解决审批立即取消。

未来原生工具、MCP、Skill和子Agent继续复用`kind`、`parentId`和`status`协议，不为每种能力建立单独流图。

## 运行事件

现有`agent_step`事件继续按`stepId`合并。MCP和审批新增产品事件：

```text
approval_required
approval_resolved
```

`approval_required`至少包含：

```json
{
  "approvalId": "apr_...",
  "runId": "run_...",
  "stepId": "step_...",
  "serverName": "Notion",
  "toolName": "notion-create-pages",
  "risk": "write",
  "inputSummary": "创建页面：项目周报",
  "expiresAt": "2026-07-24T15:10:00Z"
}
```

不得包含原始授权头、Secret、未截断工具参数或远程响应。`approval_resolved`只包含审批ID、决定和节点状态。

完成后的MCP及审批节点继续进入assistant消息的`trace_json`快照，刷新后可回放执行事实，但已完成审批不再显示可点击按钮。

## 请求流程

### 自动读取

1. 后端读取当前用户启用的原生工具和MCP工具快照。
2. MCP适配器把工具schema注册到ToolRegistry。
3. 模型自主选择`mcp__notion__notion-search`等工具。
4. 执行器解析映射并确认工具明确只读。
5. 后端刷新Token或建立本次运行的MCP会话。
6. 发出`mcp`运行节点并调用`tools/call`。
7. 脱敏、截断结果后作为tool消息回填模型。
8. 模型生成最终回答，运行节点写入`trace_json`。

### 需要确认的写入

1. 模型选择写入、删除或风险未知工具。
2. 执行器不连接远程工具，先创建审批并发出`waiting`节点。
3. 用户选择“允许本次”或“拒绝”。
4. 允许后才建立MCP调用；拒绝或超时则不发送远程请求。
5. 工具结果或`permission_denied`回填模型，模型继续回答。

## 错误处理

- OAuth拒绝、状态不匹配或PKCE失败：删除临时授权记录，不保存凭据。
- MCP初始化或工具发现失败：返回稳定错误码，保留最近一次成功工具快照。
- Token过期：刷新并重试一次；仍失败则标记`reauthorize`。
- 只读工具遇到临时连接错误：最多自动重试一次。
- 写入、删除和风险未知工具：开始远程调用后绝不自动重试，避免重复副作用。
- 工具超时：返回`mcp_tool_timeout`。
- 服务器响应过大：停止读取并返回`mcp_response_too_large`。
- 工具schema无效或模型参数校验失败：拒绝执行并返回结构化工具错误。
- 工具目录已变化：返回`mcp_tool_unavailable`并提示用户刷新目录，不自动改用相似名称。
- 用户拒绝：回填`permission_denied`，Agent可以解释限制或调整方案。
- 审批超时：回填`approval_timeout`并清理Broker状态。
- 用户停止生成：取消本地等待和尚未开始的调用；已经发送到远端的写操作可能无法撤销，界面必须明确提示。
- 单个MCP服务器失败：不影响其他已注册工具和后端进程。

模型不得把异常当成成功。所有错误进入模型前只保留稳定错误码和安全摘要。

## 安全与隐私

- MCP服务器配置、OAuth Token和静态Header按用户隔离并加密存储。
- 所有MCP接口都要求登录，OAuth回调同时校验登录会话和一次性状态。
- OAuth回调的前端返回地址复用精确origin白名单。
- 自定义地址、OAuth发现地址、重定向和DNS结果统一执行SSRF防护。
- TLS验证默认开启，产品配置不提供关闭开关。
- Token、Cookie、Authorization Header、Client Secret和PKCE Verifier不得进入日志、SSE、聊天上下文和`trace_json`。
- 运行轨迹复用并扩展现有脱敏器，敏感键匹配必须覆盖OAuth及自定义Header常见命名。
- 远程工具描述和返回内容都视为不可信数据，不能改变系统提示、权限策略或审批结果。
- 返回内容进入模型前限制字符数，进入前端前再次脱敏和截断。
- 删除连接后立即从工具注册表消失，即使远端Token撤销暂时失败。

## 配置

新增服务端配置：

```text
KNOWFLOW_MCP_CONNECT_TIMEOUT=10
KNOWFLOW_MCP_REQUEST_TIMEOUT=30
KNOWFLOW_MCP_APPROVAL_TIMEOUT=300
KNOWFLOW_MCP_MAX_RESPONSE_BYTES=1048576
KNOWFLOW_MCP_MAX_EXPOSED_TOOLS=32
KNOWFLOW_MCP_ALLOW_PRIVATE_NETWORKS=false
```

OAuth回调继续使用：

```text
KNOWFLOW_BASE_URL
KNOWFLOW_OAUTH_RETURN_ORIGINS
KNOWFLOW_SECRET_KEY
```

`.env.example`和README只使用示例地址，不出现真实Token、Client Secret或静态Header。

## 数据库迁移

SQLite和MySQL schema同时增加`mcp_server`与`mcp_oauth_session`，并通过现有schema版本机制升级。迁移必须：

- 不改写或删除现有`tool_config`、`agent_tool_call`和`chat_message.trace_json`。
- 给`mcp_server.user_id`、`mcp_oauth_session.user_id`和过期时间建立必要索引。
- 保持旧数据库可原地升级。
- 保持新建数据库与升级后的结构一致。

## 测试

所有自动化测试默认不访问公网，使用本地假MCP transport和假OAuth服务器覆盖：

### 协议与Agent循环

- `initialize`、`tools/list`和`tools/call`成功路径。
- MCP工具正确适配ToolRegistry并回填模型。
- 原生工具与多个MCP服务器可以在同次运行中共存。
- 工具名规范化、长度限制、稳定哈希和碰撞处理。
- 停用服务器或工具后不再向模型暴露schema。
- 工具返回、超时、格式错误和目录变化的结构化错误。

### OAuth与凭据

- PKCE S256、一次性`state`、过期和用户绑定。
- 标准发现、动态客户端注册和手工Client ID。
- Token加密、刷新、原子替换及重新授权状态。
- OAuth拒绝和失败时不残留临时凭据。
- API和日志只返回掩码或公开状态。
- 两个用户的服务器、Token、工具和审批完全隔离。

### 网络安全

- 拒绝IPv4、IPv6、IPv4映射IPv6、Loopback、内网、链路本地和元数据地址。
- DNS结果变化及每一跳重定向重新校验。
- OAuth发现端点与MCP端点执行相同策略。
- TLS验证、连接超时、读取超时和响应大小限制。

### 审批

- 明确只读工具自动执行。
- 写入、删除、缺少annotations和冲突annotations必须等待确认。
- “允许本次”只放行当前调用。
- 拒绝、重复提交、非所属用户、超时、取消和服务关闭正确收尾。
- 写操作网络失败后不自动重试。
- 未批准前远程服务器没有收到`tools/call`。

### 运行事件与前端

- `mcp`与`approval`节点按真实边界发送`waiting`、`running`及终态。
- `approval_required`和`approval_resolved`顺序正确。
- 当前进度、已用时间和工具调用次数实时更新。
- 设置页覆盖连接、测试、刷新、启停、重新授权和删除状态。
- 工具列表可逐项启停并显示风险。
- 审批在聊天正文和运行抽屉中保持一致。
- 刷新历史消息后可回放MCP和审批节点，但不能重新提交旧审批。
- 事件、日志和UI不包含Token、Header、Cookie、Client Secret、PKCE Verifier或未截断结果。

### 回归

- 所有现有`tests/check_*.py`通过。
- 前端`npm run build`通过。
- `git diff --check`通过。
- 敏感信息扫描确认不提交`backend/.env`、数据库、上传文件、`frontend/dist`、Token或Key。

真实Notion只进行人工冒烟测试：

1. 两个用户分别完成OAuth连接，确认彼此不可见。
2. 让Agent自动执行一次Notion搜索或读取。
3. 让Agent创建测试页面，确认调用前出现审批。
4. 拒绝一次写入，确认Notion未发生变化。
5. 允许一次写入，确认流图、结果和Notion页面一致。
6. 断开连接，确认工具立即从Agent可用列表消失。

## 验收标准

- 登录用户可以一键连接自己的Notion工作区，不输入普通Notion Integration Token。
- 用户可以添加符合标准的自定义Streamable HTTP MCP服务器。
- 每个用户只能查看和使用自己的MCP配置、Token、工具和审批。
- Agent可以自主选择已启用的MCP工具。
- 明确只读调用自动执行；写入、删除和风险未知调用未经确认绝不发送到远端。
- MCP调用和审批在现有运行流图中实时点亮，顶部指标准确更新。
- Token刷新、重新授权、超时、拒绝和服务器异常均有稳定、可理解且不泄密的结果。
- 原生工具、MCP以及未来Skill继续共享ToolRegistry和运行节点协议。
- 自动化检查、前端构建、diff检查和敏感信息扫描全部通过。

## 参考

- [Notion MCP入门](https://developers.notion.com/guides/mcp/get-started-with-mcp)
- [Notion MCP安全最佳实践](https://developers.notion.com/guides/mcp/mcp-security-best-practices)
- [MCP Streamable HTTP传输规范](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP授权规范](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [Hermes Agent MCP功能](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)
