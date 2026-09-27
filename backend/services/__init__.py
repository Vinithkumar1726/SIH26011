"""
SIH26011 - Services Package
"""
from backend.services.geometry_service import (
    generate_polyhedral_solid, calculate_volume, normalize_geometry,
    hash_geometry, solid_to_ewkt, solid_to_wkb, lonlat_to_local,
    dedupe_ring, footprint_area_m2, calculate_volume_m3, shoelace_area,
    OVERLAP_PAIRS_SQL, NEW_SOLID_PAIRS_SQL,
    db_validate_topology, db_new_solid_conflicts,
    validate_footprint_geometry, validate_unit_properties
)
from backend.services.topology_service import validate_topology, check_new_solid_conflicts, rebuild_solids
from backend.services.spatial_id_service import generate_spatial_identifier, update_spatial_identifier, get_spatial_identifier, get_identifier_history
from backend.services.import_service import analyze_import_files, persist_import
from backend.services.auth_service import verify_password, get_password_hash, create_access_token, decode_token

__all__ = [
    "generate_polyhedral_solid",
    "calculate_volume",
    "normalize_geometry",
    "hash_geometry",
    "solid_to_ewkt",
    "solid_to_wkb",
    "lonlat_to_local",
    "dedupe_ring",
    "footprint_area_m2",
    "calculate_volume_m3",
    "shoelace_area",
    "OVERLAP_PAIRS_SQL",
    "NEW_SOLID_PAIRS_SQL",
    "db_validate_topology",
    "db_new_solid_conflicts",
    "validate_footprint_geometry",
    "validate_unit_properties",
    "validate_topology",
    "check_new_solid_conflicts",
    "rebuild_solids",
    "generate_spatial_identifier",
    "update_spatial_identifier",
    "get_spatial_identifier",
    "get_identifier_history",
    "analyze_import_files",
    "persist_import",
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "decode_token",
]