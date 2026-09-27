"""
SIH26011 - Audit Trail Routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_session
from ..models import AuditLog


router = APIRouter(prefix="/api", tags=["audit"])


@router.get("/audit")
async def get_audit_trail(limit: int = 100, session: AsyncSession = Depends(get_session)):
    """Get audit trail"""
    result = await session.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    )
    logs = result.scalars().all()
    
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "details": log.details
        }
        for log in logs
    ]