from fastapi import APIRouter, HTTPException, Request

from ..runtime import api_success, approval_broker, current_user_id
from ..schemas import AgentApprovalDecision


router = APIRouter()


@router.post("/api/agent/approvals/{approval_id}")
def resolve_agent_approval(
    approval_id: str,
    payload: AgentApprovalDecision,
    request: Request,
):
    if not approval_broker.resolve(
        current_user_id(request),
        approval_id,
        payload.decision,
    ):
        raise HTTPException(
            status_code=404,
            detail="Approval not found.",
        )
    return api_success({"resolved": True})
