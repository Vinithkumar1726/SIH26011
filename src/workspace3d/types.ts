/**
 * SIH26011 — 3D Cadastral Registry
 * Type definitions mirroring the PostgreSQL cadastral.* schema
 * aligned to ISO 19152 LADM concepts.
 */

export type HeightSource = 'LIDAR' | 'DSM' | 'SURVEY' | 'PROVIDED' | 'BIM' | 'OSM' | 'AI' | 'ESTIMATED' | 'SYNTHETIC';
export type FloorCode = string; // B01, F00, F01...
export type UserRole = 'admin' | 'surveyor' | 'reviewer' | 'viewer';
export type ImportStatus = 'PERSISTED' | 'REJECTED';
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AIStatus = 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED';
export type VerticalRef = 'ellipsoidal' | 'orthometric' | 'local';
export type WorkflowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0 = dashboard

export interface Parcel {
  id: string;
  ulpin: string;
  name: string;
  area_sqm: number;
  srid: number;
}

export interface Building {
  id: string;
  parcel_id: string;
  name: string;
  height_m: number;
  height_source: HeightSource;
  floors_count: number;
  footprint: number[][]; // [[lon,lat], ...]
  ownership?: OwnershipDetails;
  valuation?: ValuationDetails;
}

export interface OwnershipDetails {
  ownerName: string;
  ownershipType: string;
  tenure: string;
  share: string;
  lastVerified: string;
}

export interface ValuationDetails {
  marketValue: number;
  assessedValue: number;
  currency: string;
  valuationYear: number;
  method: string;
  confidence: number;
}

export interface Floor {
  id: string;
  building_id: string;
  code: FloorCode;
  label: string;
  z_min: number;
  z_max: number;
  area_sqm: number;
  ownership?: OwnershipDetails;
  valuation?: ValuationDetails;
}

export interface Unit {
  id: string;
  floor_id: string;
  code: string;
  type: 'apartment' | 'parking' | 'commercial' | 'common' | 'lobby';
  label: string;
  area_sqm: number;
  volume_cum: number;
  footprint: number[][]; // [[lon,lat], ...]
  hash: string;
  version: number;
}

export interface SpatialID {
  id: string;
  full: string; // e.g. 29384756102934-B01-F01-U01-V01
  ulpin: string;
  bldg: string;
  floor: string;
  unit: string;
  version: number;
  hash: string;
  unit_id: string;
}

export interface ValidationCheck {
  id: string;
  code: string;
  label: string;
  severity: Severity;
  passed: boolean;
  detail: string;
}

export interface AIProposal {
  id: string;
  primary_model: string;
  verifier_model: string;
  iou: number;
  agreement: number;
  status: AIStatus;
  footprint_proposed: number[][];
  footprint_verified: number[][];
}

export interface ImportAudit {
  id: string;
  status: ImportStatus;
  files: string[];
  source_crs: string;
  target_srid: number;
  ids_generated: number;
  at: string;
}

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

export interface SpatialConfig {
  srid: number;
  vertical_ref: VerticalRef;
  unit: string;
}
