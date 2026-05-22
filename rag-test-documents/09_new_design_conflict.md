# KnowFlow AI 新版设计记录

这是新版设计记录，优先级高于旧版草稿。

新版系统支持普通聊天和可选 RAG：用户不选择知识库时走普通模型对话，选择知识库后自动启用检索上下文。模型配置支持 DeepSeek、OpenAI、百炼、Gemini、MiniMax、MiMo 等供应商，并根据供应商自动填充常见 Base URL。

新版系统支持本地账号登录、GitHub OAuth、HttpOnly Cookie 会话和 user_id 数据隔离。文档上传支持 Markdown、PDF、DOCX、XLSX、PPTX、HTML、JSON、CSV、TSV、RTF 等格式。
