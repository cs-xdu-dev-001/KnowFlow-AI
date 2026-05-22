"""Compatibility export for grouped API routers."""

from fastapi import APIRouter

from .routers import routers

router = APIRouter()
for item in routers:
    router.include_router(item)
