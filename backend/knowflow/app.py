from .runtime import *

OPENAPI_TAGS = [
    {"name": "系统调试", "description": "运行状态、健康检查和调试入口。"},
    {"name": "认证授权", "description": "本地账号登录、会话 Cookie 和 GitHub OAuth 授权登录。"},
    {"name": "模型配置", "description": "管理 Chat、Embedding、Rerank 等模型服务配置。"},
    {"name": "知识库", "description": "知识库空间的创建、查询、更新和删除。"},
    {"name": "文档入库", "description": "文档上传、解析、切片、向量化、重建索引和删除。"},
    {"name": "RAG 调试", "description": "检索链路调试，查看召回片段、匹配度和向量后端。"},
    {"name": "对话问答", "description": "普通对话、RAG 问答、流式输出和引用片段查询。"},
    {"name": "会话管理", "description": "会话列表、消息记录、重命名和删除。"},
    {"name": "扩展接口", "description": "暂缓模块的预留接口，不作为第一版核心链路。"},
]


app = FastAPI(
    title="KnowFlow AI API",
    version="0.3.0",
    description=(
        "KnowFlow AI 个人知识库智能工作台接口文档。"
        "当前核心链路包括模型配置、文档入库、RAG 检索调试、对话问答和会话管理。"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    openapi_tags=OPENAPI_TAGS,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content=normalize_api_error_detail(exc.detail, exc.status_code))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(item) for item in first_error.get("loc", []) if item not in {"body", "query", "path"})
    reason = first_error.get("msg") or "参数不合法"
    message = f"{field} 参数错误：{reason}" if field else f"参数错误：{reason}"
    return JSONResponse(status_code=422, content=api_error_payload(42200, message, {"errors": exc.errors()}))

if FRONTEND_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="assets")


PUBLIC_API_PATHS = {"/api/health", "/api/runtime", "/api/auth/me", "/api/auth/login", "/api/auth/register", "/api/auth/logout"}
PUBLIC_PREFIXES = ("/assets", "/docs", "/redoc", "/openapi.json", "/api/auth/oauth/", "/favicon.ico")


def is_public_path(path: str) -> bool:
    return path == "/" or path in PUBLIC_API_PATHS or any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.method == "OPTIONS" or is_public_path(request.url.path):
        return await call_next(request)
    if request.url.path.startswith("/api/"):
        user = get_current_user(request)
        if not user:
            return JSONResponse(status_code=401, content={"code": 40101, "message": "请先登录", "data": None})
        request.state.current_user = user
        adopt_legacy_data_for_user(int(user["id"]))
    return await call_next(request)


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(FRONTEND_STATIC_DIR / "index.html")


@app.get("/api/health", tags=["系统调试"], summary="健康检查")
def health_check() -> dict[str, Any]:
    return api_success(
        {
            "status": "ok",
            "time": now_str(),
            "database": db.dialect,
            "vectorBackend": vector_store.backend,
        }
    )


@app.get("/api/runtime", tags=["系统调试"], summary="查询运行时信息")
def runtime_info() -> dict[str, Any]:
    return api_success(
        {
            "database": db.dialect,
            "vectorBackend": vector_store.backend,
            "dbUrl": DB_URL.split("@")[-1] if "@" in DB_URL else DB_URL,
        }
    )

from .routers import routers

for api_router in routers:
    app.include_router(api_router)
