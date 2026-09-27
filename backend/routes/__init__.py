"""
SIH26011 - Routes Package
Includes all API routers
"""
from backend.routes.health import router as health_router
from backend.routes.dashboard import router as dashboard_router
from backend.routes.parcels import router as parcels_router
from backend.routes.buildings import router as buildings_router
from backend.routes.floors import router as floors_router
from backend.routes.units import router as units_router
from backend.routes.spatial_ids import router as spatial_ids_router
from backend.routes.import_routes import router as import_router
from backend.routes.validation import router as validation_router
from backend.routes.geometry_3d import router as geometry_3d_router
from backend.routes.ai_routes import router as ai_router
from backend.routes.audit import router as audit_router
from backend.routes.search import router as search_router
from backend.routes.auth import router as auth_router
from backend.routes.cadastral_parcels import router as cadastral_parcels_router


def include_routers(app):
    """Include all routers in the FastAPI app."""
    app.include_router(health_router)
    app.include_router(dashboard_router)
    app.include_router(parcels_router)
    app.include_router(buildings_router)
    app.include_router(floors_router)
    app.include_router(units_router)
    app.include_router(spatial_ids_router)
    app.include_router(import_router)
    app.include_router(validation_router)
    app.include_router(geometry_3d_router)
    app.include_router(ai_router)
    app.include_router(audit_router)
    app.include_router(search_router)
    app.include_router(auth_router)
    app.include_router(cadastral_parcels_router)


__all__ = [
    "health_router",
    "dashboard_router",
    "parcels_router",
    "buildings_router",
    "floors_router",
    "units_router",
    "spatial_ids_router",
    "import_router",
    "validation_router",
    "geometry_3d_router",
    "ai_router",
    "audit_router",
    "search_router",
    "auth_router",
    "cadastral_parcels_router",
    "include_routers",
]