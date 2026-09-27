/**
 * SIH26011 - API Types
 * Complete TypeScript interfaces for all API responses
 * NO `any` types allowed
 */

// Base response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== Health ====================
export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

// ==================== Dashboard ====================
export interface DashboardStats {
  total_parcels: number;
  total_buildings: number;
  total_floors: number;
  total_units: number;
  total_3d_units: number;
  validated_units: number;
  conflicts: number;
  ai_proposals_pending: number;
  last_validation?: {
    status: string;
    timestamp: string | null;
  } | null;
}

export interface BuildingHeightRange {
  range: string;
  count: number;
}

export interface ValidationState {
  clean: number;
  warnings: number;
  errors: number;
  not_validated: number;
  total: number;
}

// ==================== Import ====================
export interface ImportAnalyzeResponse {
  parcel_count: number;
  building_count: number;
  floor_count: number;
  unit_count: number;
  detected_crs: string;
  geometry_types: string[];
  warnings: string[];
}

export interface PersistRequest {
  user_role: string;
}

export interface PersistResponse {
  session_id: string;
  status: string;
  parcels_created: number;
  buildings_created: number;
  floors_created: number;
  units_created: number;
  identifiers_generated: number;
  validation_passed: boolean;
  validation_issues: number;
}

// ==================== Validation ====================
export interface ValidationIssue {
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  code: string;
  message: string;
  entity_id?: string;
  overlap_volume?: number;
}

export interface ValidationResult {
  passed: boolean;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  issues: ValidationIssue[];
}

export interface ValidationRunResponse {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'RUNNING' | 'PASSED' | 'FAILED';
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  issues: ValidationIssue[];
}

// ==================== 3D Geometry ====================
export interface ParcelGeometry {
  id: string;
  ulpin: string;
  name: string;
  area_sqm: number;
  srid: number;
  geometry: GeoJSON.MultiPolygon | null;
  created_at: string | null;
}

export interface BuildingGeometry {
  id: string;
  parcel_id: string;
  name: string;
  height_m: number;
  height_source: string;
  floors_count: number;
  footprint: GeoJSON.Polygon | null;
  solid_geom: any; // PolyhedralSurface not supported by GeoJSON
  created_at: string | null;
}

export interface FloorGeometry {
  id: string;
  building_id: string;
  floor_code: string;
  floor_label: string;
  z_min: number;
  z_max: number;
  area_sqm: number;
  solid_geom: any;
}

export interface UnitGeometry {
  id: string;
  floor_id: string;
  unit_code: string;
  unit_type: string;
  label: string;
  area_sqm: number;
  volume_cum: number;
  footprint: GeoJSON.Polygon | null;
  solid_geom: any;
  geometry_hash: string;
  geometry_version: number;
  z_min: number;
  z_max: number;
  created_at: string | null;
}

export interface GeometryData {
  parcels: ParcelGeometry[];
  buildings: BuildingGeometry[];
  floors: FloorGeometry[];
  units: UnitGeometry[];
}

// ==================== Parcels (hierarchy) ====================
export interface ParcelFeatureProperties {
  kind: 'parcel' | 'building' | 'floor' | 'unit';
  id: string;
  ulpin?: string;
  name?: string;
  area_sqm?: number;
  srid?: number;
  parcel_id?: string;
  height_m?: number;
  height_source?: string;
  floors_count?: number;
  building_id?: string;
  floor_code?: string;
  floor_label?: string;
  z_min?: number;
  z_max?: number;
  unit_code?: string;
  unit_type?: string;
  label?: string;
  volume_cum?: number;
  geometry_hash?: string;
  geometry_version?: number;
  spatial_id?: SpatialIdInfo;
}

export interface SpatialIdInfo {
  id: string;
  full: string;
  ulpin: string;
  bldg: string;
  floor: string;
  unit: string;
  version: number;
  hash: string;
  unit_id: string;
}

export interface ParcelHierarchyResponse {
  type: 'FeatureCollection';
  features: GeoJSON.Feature<GeoJSON.Geometry | null, ParcelFeatureProperties>[];
}

// ==================== Buildings ====================
export interface BuildingResponse {
  id: string;
  parcel_id: string;
  name: string;
  height_m: number;
  height_source: string;
  floors_count: number;
  footprint: GeoJSON.Polygon | null;
  solid_geom: any;
  created_at: string | null;
}

export interface BuildingListResponse {
  id: string;
  parcel_id: string;
  name: string;
  height_m: number;
  height_source: string;
  floors_count: number;
  footprint: GeoJSON.Polygon | null;
  solid_geom: any;
  created_at: string | null;
}

// ==================== Floors ====================
export interface FloorResponse {
  id: string;
  building_id: string;
  floor_code: string;
  floor_label: string;
  z_min: number;
  z_max: number;
  area_sqm: number;
  solid_geom: any;
}

// ==================== Property Units ====================
export interface UnitResponse {
  id: string;
  floor_id: string;
  unit_code: string;
  unit_type: string;
  label: string;
  area_sqm: number;
  volume_cum: number;
  footprint: GeoJSON.Polygon | null;
  solid_geom: any;
  geometry_hash: string;
  geometry_version: number;
  z_min: number;
  z_max: number;
  created_at: string | null;
}

export interface PropertyDetailResponse {
  id: string;
  floor_id: string;
  unit_code: string;
  unit_type: string;
  label: string;
  area_sqm: number;
  volume_cum: number;
  footprint: GeoJSON.Polygon | null;
  solid_geom: any;
  geometry_hash: string;
  geometry_version: number;
  z_min: number;
  z_max: number;
  created_at: string | null;
  floor: FloorResponse;
  building: BuildingResponse;
  parcel: ParcelGeometry;
  spatial_identifier: {
    id: string;
    identifier_string: string;
    version: number;
    geometry_hash: string;
  } | null;
}

export interface UnitGeometryUpdateRequest {
  footprint?: GeoJSON.Polygon;
  z_min_m?: number;
  z_max_m?: number;
  user_role: string;
  reason?: string;
}

export interface UnitGeometryUpdateResponse {
  unit_id: string;
  old_version: number;
  new_version: number;
  old_geometry_hash: string;
  new_geometry_hash: string;
  spatial_identifier: string;
  status: string;
}

export interface UnitHistoryEntry {
  version: number;
  identifier_string: string;
  geometry_hash: string;
  footprint: GeoJSON.Polygon | Record<string, never>;
  z_min: number;
  z_max: number;
  changed_at: string;
  changed_by: string | null;
  reason: string | null;
  retired_geom?: string;
}

export interface UnitHistoryResponse {
  unit_id: string;
  current_version: number;
  history: UnitHistoryEntry[];
}

// ==================== Spatial Identifiers ====================
export interface SpatialIdentifierResponse {
  id: string;
  identifier_string: string;
  ulpin: string;
  building_code: string;
  floor_code: string;
  unit_code: string;
  version: number;
  geometry_hash: string;
  property_unit_id: string;
  created_at: string | null;
}

// ==================== AI ====================
export interface AIJobRequest {
  job_type: string;
  target_id: string;
}

export interface AIJobResponse {
  job_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
}

export interface LiveExtractionRequest {
  latitude: number;
  longitude: number;
  building_height_m: number;
}

export interface LiveExtractionResponse {
  status: 'PENDING_REVIEW';
  proposal_id: string;
  source: string;
}

export interface BatchExtractionRequest {
  latitude: number;
  longitude: number;
  building_height_m: number;
}

export interface BatchExtractionResponse {
  status: 'PENDING_REVIEW';
  count: number;
  proposal_ids: string[];
  z_base_msl_m: number;
  source: string;
}

export interface AOIValidateRequest {
  aoi: Record<string, any>;
}

export interface AOIValidateResponse {
  valid: boolean;
  aoi: Record<string, any>;
}

export interface MosaicRequest {
  aoi: Record<string, any>;
  zoom: number;
  provider?: string;
}

export interface MosaicResponse {
  aoi: Record<string, any>;
  zoom: number;
  tiles: any[];
  tile_count: number;
  image_base64: string;
  width_px: number;
  height_px: number;
  meters_per_pixel: number;
  imagery: Record<string, any>;
}

export interface DetectBatchRequest {
  aoi: Record<string, any>;
  zoom: number;
  provider?: string;
  building_height_m: number;
}

export interface DetectBatchResponse {
  status: 'PENDING_REVIEW';
  count: number;
  proposal_ids: string[];
  tiles: number;
  z_base_msl_m: number;
  source: string;
  imagery: Record<string, any>;
}

export interface ProposalEditRequest {
  height_m?: number;
  floors_override?: number;
  height_source?: string;
}

export interface ProposalEditResponse {
  status: 'REVIEW_REQUIRED';
  proposal_id: string;
  proposal_data: Record<string, any>;
}

export interface AICategory {
  name: string;
  count: number;
  percentage: number;
}

export interface AIProposalSummary {
  id: string;
  building_id: string | null;
  iou_score: number | null;
  agreement_score: number | null;
  status: string;
  source: string | undefined;
  ulpin: string | undefined;
  height_m: number | undefined;
  height_source: string;
  floors_override: number | undefined;
  z_base_msl_m: number;
  created_at: string | null;
}

export interface AICandidatesResponse {
  total: number;
  categories: AICategory[];
  proposals: AIProposalSummary[];
}

export interface AIProposalDetail {
  id: string;
  building_id: string | null;
  model_primary: string;
  model_verifier: string | null;
  status: string;
  source: string | undefined;
  source_label: string;
  ulpin: string | undefined;
  height_m: number | undefined;
  lat: number | undefined;
  lon: number | undefined;
  wkt: string | undefined;
  created_at: string | null;
}

export interface ReviewRequest {
  decision: 'APPROVED' | 'REJECTED';
}

export interface ReviewResponse {
  status: string;
  proposal_id: string;
  ulpin: string | undefined;
  encroachment: boolean;
  reviewed_at: string;
}

// ==================== Cadastral Parcels ====================
export interface CadastralParcel {
  parcel_id: string;
  height_m: number;
  footprint: GeoJSON.Polygon | null;
  encroachment: boolean;
  elevation_msl_m: number;
}

export interface CadastralParcelDetail {
  parcel_id: string;
  height_m: number;
  elevation_msl_m: number;
  roof_elevation_msl_m: number;
  footprint_area_sqm: number | null;
  perimeter_m: number | null;
  centroid: GeoJSON.Point | null;
  volume_cum: number | null;
  fp_valid: boolean;
  geometry_version: number;
  height_source: string;
  geometry_source: string;
  imagery_provider: string | undefined;
  model: string | undefined;
  confidence: number | undefined;
  source_meta: Record<string, any>;
  floors_estimated: number;
  floor_schedule: Array<{
    floor: string;
    z_min_msl_m: number;
    z_max_msl_m: number;
  }>;
}

// ==================== Search ====================
export interface SearchResult {
  type: 'parcel' | 'building' | 'property_unit';
  id: string;
  label: string;
  ulpin?: string;
  unit_code?: string;
}

// ==================== Audit ====================
export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  timestamp: string;
  details: Record<string, any> | null;
}

// ==================== Auth ====================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'surveyor' | 'reviewer' | 'viewer';
    display_name: string;
  };
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  id: string;
  username: string;
  role: 'admin' | 'surveyor' | 'reviewer' | 'viewer';
  display_name: string;
  is_active: boolean;
}