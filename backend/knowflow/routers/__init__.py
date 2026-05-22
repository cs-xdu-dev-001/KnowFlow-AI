"""API router registry."""

from .auth import router as auth_router
from .model_configs import router as model_config_router
from .knowledge import router as knowledge_router
from .chat import router as chat_router
from .extensions import router as extension_router

routers = [
    auth_router,
    model_config_router,
    knowledge_router,
    chat_router,
    extension_router,
]
