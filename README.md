# KnowFlow AI

KnowFlow AI 是一个面向个人学习资料、项目文档和技术笔记的知识库智能工作台，核心能力包括模型配置、文档入库、语义检索、多轮问答、引用片段展示和会话管理。

项目采用前后端分离思路实现：后端使用 FastAPI 提供 REST API 和流式问答接口；前端使用 React + Vite 工程化构建，并保留可由 FastAPI 直接托管的生产构建产物。

## 功能概览

- 本地账号登录、注册、退出登录和 HttpOnly Cookie 会话保护。
- GitHub OAuth 授权登录，配置 Client ID / Secret 后可启用。
- 模型配置管理，支持 Chat、Embedding、Rerank 等模型用途。
- 常见模型供应商预设，包括 OpenAI、DeepSeek、百炼、Gemini、MiniMax、MiMo 等。
- 知识库管理，创建知识库时绑定 Embedding 模型，避免不同向量空间混用。
- 文档上传、MD5 去重、解析、切分、向量化和入库状态跟踪。
- 支持 txt、md、pdf、docx、xlsx、pptx、html、json、csv、tsv、rtf、yaml、xml、log 等常见文档格式。
- RAG 检索调试，展示 Top-K 片段、分数和引用来源。
- 统一 AI 对话入口：选择知识库时自动启用 RAG，不选择知识库时走普通模型对话。
- 会话历史管理，支持连续追问、重命名和删除。
- Swagger UI / ReDoc / OpenAPI JSON 接口文档。

## 当前实现状态

当前版本已经不是纯静态 demo，支持真实后端接口、用户数据隔离、模型服务配置、文档处理任务状态和 RAG 检索链路。

为了方便本地启动，系统仍保留开发 fallback：

- 没有配置模型 API Key 时，问答会返回本地 fallback 结果。
- 没有配置 Embedding API Key 时，向量化会使用本地确定性 hash 向量。
- 没有启用 Chroma 时，检索会使用本地词法相似度作为替代。

生产演示时建议配置真实 Chat / Embedding 模型，避免 fallback 回答影响观感。

## 项目结构

```text
KnowFlow AI/
  backend/
    main.py
    knowflow/
      app.py              FastAPI 应用、鉴权中间件、静态资源托管
      config.py           环境变量、路径、运行配置
      database.py         Database 封装与 schema 初始化
      db_schema.py        SQLite / MySQL 建表语句
      responses.py        统一响应与异常结构
      runtime.py          RAG、文档处理、模型网关和业务工具函数
      schemas.py          Pydantic 请求模型
      routers/
        auth.py
        model_configs.py
        knowledge.py
        chat.py
        extensions.py
    requirements.txt
    .env.example
  frontend/
    package.json
    vite.config.js
    react/
      index.html
      src/
        App.jsx
        main.jsx
        components/
        controller/
          knowflowController.js
        styles.css
    dist/                 React/Vite 生产构建产物
    index.html            无 dist 时的构建提示页
    styles.css            React 样式源文件，同步到 react/src/styles.css
  docs/
    api-debug.md
    schema.sql
  tests/
    check_*.py
```

## 后端启动

```powershell
cd "C:\Users\z2986\Desktop\KnowFlow AI\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

打开应用：

```text
http://127.0.0.1:8000
```

接口文档：

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/redoc
http://127.0.0.1:8000/openapi.json
```

## 前端开发

前端源码位于 `frontend/react`，由 Vite 管理。

```powershell
cd "C:\Users\z2986\Desktop\KnowFlow AI\frontend"
npm install
npm run dev
```

开发服务默认运行在：

```text
http://127.0.0.1:5173
```

Vite 已配置 `/api` 代理到 `http://127.0.0.1:8000`，因此开发时需要同时启动 FastAPI 后端。

构建生产前端：

```powershell
npm run build
```

构建完成后会生成 `frontend/dist`。后端启动时会优先托管 `frontend/dist`；如果 `dist` 不存在，只会显示 `frontend/index.html` 构建提示页，不再加载旧版 `app.js`。

## Auth Mode / 认证配置

本地账号登录默认可用。后端使用 PBKDF2 保存密码 hash，登录成功后写入 `knowflow_session` HttpOnly Cookie。

除以下公开接口外，其余 `/api/*` 默认需要登录：

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/auth/oauth/*`
- `/api/health`
- `/api/runtime`

启用 GitHub OAuth：

```text
KNOWFLOW_BASE_URL=http://127.0.0.1:8000
KNOWFLOW_GITHUB_CLIENT_ID=your_github_client_id
KNOWFLOW_GITHUB_CLIENT_SECRET=your_github_client_secret
```

GitHub OAuth App 中填写：

```text
Homepage URL: http://127.0.0.1:8000
Authorization callback URL: http://127.0.0.1:8000/api/auth/oauth/github/callback
```

部署到域名后，需要把 `KNOWFLOW_BASE_URL` 和 GitHub OAuth 回调地址改成线上域名。

## MySQL 模式

默认使用 SQLite。切换 MySQL 时先创建数据库：

```sql
CREATE DATABASE knowflow_ai DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

然后修改 `backend/.env`：

```text
KNOWFLOW_DB_URL=mysql+pymysql://root:123456@127.0.0.1:3306/knowflow_ai?charset=utf8mb4
```

后端启动时会自动初始化数据表。

## Chroma 模式

默认使用本地检索。启用 Chroma：

```text
KNOWFLOW_VECTOR_BACKEND=chroma
KNOWFLOW_CHROMA_DIR=./data/chroma
```

如果 Embedding 模型配置了可用 API Key 和 OpenAI-compatible `/embeddings` 接口，Chroma 会存储真实向量；否则会使用本地 hash 向量作为开发 fallback。

## 模型供应商说明

后端统一按 OpenAI-compatible 协议调用模型：

- Chat：`POST {baseUrl}/chat/completions`
- Embedding：`POST {baseUrl}/embeddings`

DeepSeek、OpenAI、百炼兼容模式等供应商可以直接配置 `baseUrl`、`apiKey` 和 `modelName`。应用不会篡改模型身份，如果用户询问当前模型，应按配置返回，例如 `deepseek / deepseek-chat`。

## 验证命令

```powershell
cd "C:\Users\z2986\Desktop\KnowFlow AI"
python tests/check_auth_flow.py
python tests/check_user_isolation_and_tasks.py
python tests/check_document_processing_flow.py
python tests/check_frontend_professional.py
```

前端构建检查：

```powershell
cd "C:\Users\z2986\Desktop\KnowFlow AI\frontend"
npm run build
```
