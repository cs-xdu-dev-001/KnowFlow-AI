# KnowFlow AI

KnowFlow AI is a local-first knowledge base assistant for document ingestion, retrieval-augmented generation, model configuration, and chat history management.

The project is built with a FastAPI backend and a React + Vite frontend. It is designed for personal knowledge workflows: upload documents, organize them into knowledge bases, retrieve relevant passages, and ask questions with visible citation evidence.

## Features

- Local account authentication with HttpOnly cookie sessions.
- Optional GitHub OAuth login.
- Model configuration for chat and embedding providers.
- OpenAI-compatible chat and embedding gateway.
- Knowledge base management with per-user data isolation.
- Document upload, deduplication, parsing, chunking, and ingestion status tracking.
- Support for common document formats including `txt`, `md`, `pdf`, `docx`, `xlsx`, `pptx`, `html`, `json`, `csv`, `tsv`, `rtf`, `yaml`, `xml`, and `log`.
- RAG debugging with retrieved chunks, scores, matched terms, and retrieval quality metadata.
- Retrieval run tracking through the `retrieval_run` table and detail API.
- Chat interface with references, evidence drawer, and session history.
- FastAPI Swagger UI, ReDoc, and OpenAPI JSON documentation.

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Pydantic
- Frontend: React, Vite
- Database: SQLite by default, MySQL supported
- Vector backend: local retrieval by default, Chroma supported
- Document parsing: pypdf, python-docx, openpyxl, python-pptx, BeautifulSoup

## Project Structure

```text
KnowFlow AI/
  backend/
    main.py
    knowflow/
      app.py              FastAPI app, auth middleware, static hosting
      config.py           environment variables and runtime paths
      database.py         database wrapper and schema initialization
      db_schema.py        SQLite / MySQL DDL
      responses.py        API response helpers
      runtime.py          RAG, document ingestion, model gateway wiring
      schemas.py          Pydantic request models
      routers/            API routers
      services/           document parsing, model gateway, vector store
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
        styles.css
    styles.css            canonical stylesheet, synced into React source
  docs/
    api-debug.md
    schema.sql
  tests/
    check_*.py
```

## Requirements

- Python 3.10+
- Node.js 18+
- npm

SQLite works out of the box. MySQL and Chroma are optional.

## Quick Start

Clone the repository and enter the project directory:

```powershell
git clone <your-repo-url>
cd "KnowFlow AI"
```

Create the backend environment:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Start the backend:

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

The Vite dev server proxies `/api`, `/docs`, `/redoc`, and `/openapi.json` to the backend. If the backend runs on another port, set `VITE_BACKEND_URL` before starting the frontend:

```powershell
$env:VITE_BACKEND_URL="http://127.0.0.1:8001"
npm run dev
```

## Production Build

Build the React frontend:

```powershell
cd frontend
npm run build
```

The build output is written to `frontend/dist`. When `frontend/dist` exists, the FastAPI backend serves it from `/`. If `dist` is missing, the backend serves a small fallback page that tells you to build the frontend first.

## Configuration

Copy `backend/.env.example` to `backend/.env` and update values as needed.

| Variable | Description | Default |
| --- | --- | --- |
| `KNOWFLOW_DB_URL` | SQLAlchemy database URL | `sqlite:///./data/knowflow.db` |
| `KNOWFLOW_SECRET_KEY` | Key used to encrypt stored model API keys | `change-this-dev-secret` |
| `KNOWFLOW_BASE_URL` | Public backend URL, used by OAuth callbacks | `http://127.0.0.1:8000` |
| `KNOWFLOW_VECTOR_BACKEND` | `local` or `chroma` | `local` |
| `KNOWFLOW_CHROMA_DIR` | Chroma persistence directory | `./data/chroma` |
| `KNOWFLOW_GITHUB_CLIENT_ID` | GitHub OAuth client ID | empty |
| `KNOWFLOW_GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | empty |
| `KNOWFLOW_COOKIE_SECURE` | Set to `1` when serving over HTTPS | `0` |
| `KNOWFLOW_TOP_K` | Default retrieval result count | `5` |
| `KNOWFLOW_RAG_SCORE_THRESHOLD` | Retrieval quality threshold | `0.25` |

Do not commit `backend/.env`. The repository `.gitignore` excludes local environment files, runtime databases, uploads, logs, browser test profiles, and build output.

## Auth Mode / Authentication

Local username and password login is enabled by default. Passwords are stored as PBKDF2 hashes, and successful login creates a `knowflow_session` HttpOnly cookie.

GitHub OAuth is optional. To enable it, create a GitHub OAuth App and set:

```text
KNOWFLOW_GITHUB_CLIENT_ID=your_client_id
KNOWFLOW_GITHUB_CLIENT_SECRET=your_client_secret
```

For local development, use this callback URL:

```text
http://127.0.0.1:8000/api/auth/oauth/github/callback
```

## Model Providers

KnowFlow AI calls chat and embedding models through OpenAI-compatible endpoints:

```text
POST {baseUrl}/chat/completions
POST {baseUrl}/embeddings
```

You can configure providers such as OpenAI, DeepSeek, DashScope-compatible services, Gemini-compatible gateways, MiniMax, and MiMo by setting `baseUrl`, `apiKey`, and `modelName` in the model configuration screen.

For development, the backend includes fallback behavior:

- If no chat API key is configured, chat responses use a local fallback answer.
- If no embedding API key is configured, embedding uses a deterministic local hash vector.
- If Chroma is disabled, retrieval uses the local retrieval backend.

For demos or production-like usage, configure real chat and embedding models.

## Database Options

SQLite is the default and needs no setup.

To use MySQL, create a database:

```sql
CREATE DATABASE knowflow_ai DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

Then set:

```text
KNOWFLOW_DB_URL=mysql+pymysql://user:password@127.0.0.1:3306/knowflow_ai?charset=utf8mb4
```

The backend initializes missing tables at startup.

## API Documentation

After starting the backend:

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/redoc
http://127.0.0.1:8000/openapi.json
```

The RAG debugging endpoint is available at:

```text
POST /api/retrieval/debug
GET  /api/retrieval/runs/{run_id}
```

## Quality Checks

Run all project checks from the repository root:

```powershell
Get-ChildItem tests -Filter "check_*.py" |
  Sort-Object Name |
  ForEach-Object {
    python $_.FullName
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
```

Build the frontend:

```powershell
cd frontend
npm run build
```

## Security Notes

- Change `KNOWFLOW_SECRET_KEY` before storing real API keys.
- Keep `backend/.env` local.
- Use HTTPS and set `KNOWFLOW_COOKIE_SECURE=1` when deploying behind a real domain.
- Review OAuth callback URLs before publishing a deployment.

## Current Status

KnowFlow AI is usable as a local knowledge base assistant and development prototype. The main remaining engineering work is to finish removing legacy DOM-controller code from the React frontend and introduce versioned database migrations for larger schema changes.
