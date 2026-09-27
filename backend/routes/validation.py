"""
SIH26011 - Validation Routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from ..database import get_session
from ..models import PropertyUnit, ValidationRun
from ..services.topology_service import validate_topology
from ..schemas.validation_schemas import ValidationRunResponse


router = APIRouter(prefix="/api", tags=["validation"])


@router.post("/validation/run", response_model=ValidationRunResponse)
async def run_validation(session: AsyncSession = Depends(get_session)):
    """Run 3D topology validation"""
    try:
        # Count units under validation
        unit_count = await session.execute(select(func.count(PropertyUnit.id)))
        total = unit_count.scalar() or 0
        
        # Run validation natively in PostGIS
        validation_result = await validate_topology(session)
        
        # Save validation run
        validation_run = ValidationRun(
            id=f"vrun-{datetime.utcnow().timestamp()}",
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            status="PASSED" if validation_result["valid"] else "FAILED",
            total_checks=total,
            passed_checks=total - len([i for i in validation_result["issues"] if i["severity"] == "HIGH"]),
            failed_checks=len([i for i in validation_result["issues"] if i["severity"] == "HIGH"]),
            issues=validation_result["issues"]
        )
        
        session.add(validation_run)
        await session.commit()
        
        return ValidationRunResponse(
            id=validation_run.id,
            started_at=validation_run.started_at.isoformat(),
            completed_at=validation_run.completed_at.isoformat(),
            status=validation_run.status,
            total_checks=validation_run.total_checks,
            passed_checks=validation_run.passed_checks,
            failed_checks=validation_run.failed_checks,
            issues=validation_run.issues
        )
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}\n{tb}")