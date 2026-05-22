CREATE TABLE model_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '配置名称',
  provider VARCHAR(50) NOT NULL COMMENT '供应商，如 openai/deepseek/dashscope/gemini/minimax',
  model_type VARCHAR(30) NOT NULL COMMENT 'chat/embedding/rerank',
  base_url VARCHAR(255) NOT NULL,
  api_key_cipher TEXT COMMENT '加密后的 API Key',
  model_name VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2) DEFAULT NULL,
  top_p DECIMAL(3,2) DEFAULT NULL,
  max_tokens INT DEFAULT NULL,
  is_default TINYINT DEFAULT 0,
  status VARCHAR(30) DEFAULT 'untested' COMMENT 'untested/available/unavailable',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE knowledge_base (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  embedding_model_config_id BIGINT NOT NULL,
  document_count INT DEFAULT 0,
  chunk_count INT DEFAULT 0,
  status VARCHAR(30) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE document (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  knowledge_base_id BIGINT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(20),
  file_size BIGINT,
  file_md5 VARCHAR(64) NOT NULL,
  storage_path VARCHAR(500),
  parse_status VARCHAR(30) DEFAULT 'pending' COMMENT 'pending/processing/success/failed',
  chunk_count INT DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_kb_md5 (knowledge_base_id, file_md5)
);

CREATE TABLE document_chunk (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  knowledge_base_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  chunk_index INT NOT NULL,
  chunk_text LONGTEXT,
  vector_id VARCHAR(100) NOT NULL COMMENT 'Chroma 中的向量 ID',
  token_count INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kb_doc (knowledge_base_id, document_id)
);

CREATE TABLE chat_session (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255),
  knowledge_base_id BIGINT,
  chat_model_config_id BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chat_message (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(64) NOT NULL,
  role VARCHAR(20) NOT NULL COMMENT 'user/assistant/system/tool',
  content LONGTEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_session_time (session_id, created_at)
);

CREATE TABLE message_reference (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  message_id BIGINT NOT NULL COMMENT 'assistant 消息 ID',
  document_id BIGINT NOT NULL,
  chunk_id BIGINT NOT NULL,
  score DECIMAL(6,4),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_tool_call (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(64) NOT NULL,
  message_id BIGINT,
  tool_name VARCHAR(100) NOT NULL,
  input_json JSON,
  output_text LONGTEXT,
  status VARCHAR(30) DEFAULT 'success' COMMENT 'success/failed',
  error_message TEXT,
  latency_ms INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_session_time (session_id, created_at)
);

CREATE TABLE sync_task (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  source_type VARCHAR(30) NOT NULL COMMENT 'notion/local/github',
  source_url VARCHAR(500),
  target_type VARCHAR(30) COMMENT 'knowledge_base/github',
  knowledge_base_id BIGINT,
  status VARCHAR(30) DEFAULT 'pending',
  result_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

