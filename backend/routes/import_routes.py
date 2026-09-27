"""
SIH26011 - Import Routes
"""
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from ..database import get_session
from ..services.import_service import analyze_import_files, persist_import
from ..schemas.import_schemas import ImportAnalyzeResponse, PersistRequest, PersistResponse


router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/analyze", response_model=ImportAnalyzeResponse)
async def analyze_import(
    parcel: Optional[UploadFile] = File(None),
    buildings: Optional[UploadFile] = File(None),
    floors_csv: Optional[UploadFile] = File(None),
    units: Optional[UploadFile] = File(None)
):
    """Analyze uploaded cadastral files"""
    try:
        parcel_content = await parcel.read() if parcel else None
        buildings_content = await buildings.read() if buildings else None
        floors_content = await floors_csv.read() if floors_csv else None
        units_content = await units.read() if units else None
        
        result = await analyze_import_files(
            parcel_content, buildings_content, floors_content, units_content
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/persist", response_model=PersistResponse)
async def persist_import_endpoint(
    parcel: Optional[UploadFile] = File(None),
    buildings: Optional[UploadFile] = File(None),
    floors_csv: Optional[UploadFile] = File(None),
    units: Optional[UploadFile] = File(None),
    user_role: str = "surveyor",
    session: AsyncSession = Depends(get_session)
):
    """Persist imported cadastral data to database"""
    try:
        parcel_content = await parcel.read() if parcel else None
        buildings_content = await buildings.read() if buildings else None
        floors_content = await floors_csv.read() if floors_csv else None
        units_content = await units.read() if units else None
        
        result = await persist_import(
            parcel_content, buildings_content, floors_content, units_content, user_role, session=session
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persist failed: {str(e)}")