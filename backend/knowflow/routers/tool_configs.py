from fastapi import APIRouter, HTTPException, Request

from ..runtime import ToolConfigUpdate, api_success, current_user_id, tool_configs


router = APIRouter()
TOOL_CONFIG_TAGS = ["Tool Configuration"]
SUPPORTED_TOOL_NAMES = {"web_search"}


def require_tool_name(tool_name: str) -> str:
    if tool_name not in SUPPORTED_TOOL_NAMES:
        raise HTTPException(status_code=404, detail="Tool configuration not found.")
    return tool_name


@router.get("/api/tool-configs", tags=TOOL_CONFIG_TAGS, summary="List tool configurations")
def list_tool_configs(request: Request) -> dict:
    return api_success(tool_configs.list_for_user(current_user_id(request)))


@router.put(
    "/api/tool-configs/{tool_name}",
    tags=TOOL_CONFIG_TAGS,
    summary="Save a tool configuration",
)
def save_tool_config(
    tool_name: str,
    payload: ToolConfigUpdate,
    request: Request,
) -> dict:
    require_tool_name(tool_name)
    try:
        data = tool_configs.upsert(
            current_user_id(request),
            tool_name,
            enabled=payload.enabled,
            api_key=payload.apiKey,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return api_success(data)


@router.delete(
    "/api/tool-configs/{tool_name}",
    tags=TOOL_CONFIG_TAGS,
    summary="Delete a tool configuration",
)
def delete_tool_config(tool_name: str, request: Request) -> dict:
    require_tool_name(tool_name)
    tool_configs.delete(current_user_id(request), tool_name)
    return api_success(True)
