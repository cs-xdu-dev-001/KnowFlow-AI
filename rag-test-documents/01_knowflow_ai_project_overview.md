# KnowFlow AI 项目说明

KnowFlow AI 是一个面向个人学习资料、项目文档和技术笔记的知识库智能工作台。系统支持用户上传本地文档，并完成 MD5 去重、内容解析、文本切分、Embedding 向量化、向量库入库和元数据记录。

## 核心功能

- 模型配置：统一管理不同 AI 供应商的 Base URL、API Key、模型名称和推理参数。
- 知识库管理：创建不同知识空间，绑定 Embedding 模型配置。
- 文档入库：支持 txt、md、pdf、docx、xlsx、pptx、html、json、csv、tsv、rtf 等常见文档。
- 智能问答：选择知识库后自动启用检索上下文，不选择知识库时走普通模型对话。
- 会话管理：按照 session_id 保存多轮消息，支持历史会话恢复。
- 引用追踪：回答关联文档切片，前端展示引用片段和相似度分数。
- 认证授权：支持本地账号和 GitHub OAuth，用户数据按 user_id 隔离。

## 技术栈

后端使用 FastAPI，数据层支持 SQLite 与 MySQL。向量检索支持 Chroma，也支持本地向量后端。前端采用原生 HTML、CSS、JavaScript 实现 ChatGPT/Codex 风格的工作台界面。

## 关键设计

知识库创建时绑定 Embedding 模型配置，避免不同 Embedding 模型生成的向量空间不一致。如果后续更换 Embedding 模型，需要对知识库文档重新向量化。

RAG 问答链路包括：用户问题、当前会话历史、Top-K 检索片段、Prompt 模板和 Chat Model。系统要求模型优先依据检索资料回答；当资料不足时，应明确说明无法从知识库确认。
