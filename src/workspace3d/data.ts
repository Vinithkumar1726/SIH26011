/**
 * SIH26011 — Cadastral mock data & geometry utilities.
 *
 * Represents a synthetic residential complex in Delhi NCR
 * (lon ≈ 77.21°E, lat ≈ 28.61°N) with realistic ULPIN,
 * floor codes, and property units.
 */

import type {
  Parcel, Building, Floor, Unit, SpatialID,
  ValidationCheck, AIProposal, ImportAudit, AppUser, SpatialConfig
} from './types';

// ─── Geometry helpers ──────────────────────────────────────────

/** Deterministic fake SHA-256 (for demo only). */
export function fakeHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return (hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64);
}

/** Convert lat/lon offset to local meters (approximate). */
export function lonLatToLocal(
  lon: number, lat: number, centerLon: number, centerLat: number
): { x: number; y: number } {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);
  return {
    x: (lon - centerLon) * metersPerDegLon,
    y: (lat - centerLat) * metersPerDegLat
  };
}

/** Build a rectangular footprint centred on (lon, lat). */
export function rectFootprint(
  lon: number, lat: number, dLon: number, dLat: number
): number[][] {
  return [
    [lon - dLon, lat - dLat],
    [lon + dLon, lat - dLat],
    [lon + dLon, lat + dLat],
    [lon - dLon, lat + dLat],
    [lon - dLon, lat - dLat], // close ring
  ];
}

/** Convert footprint to local coordinates (meters from center). */
export function footprintToLocal(footprint: number[][], centerLon: number, centerLat: number): [number, number][] {
  return footprint.map(([lon, lat]) => {
    const { x, y } = lonLatToLocal(lon, lat, centerLon, centerLat);
    return [x, y];
  });
}

/** WGS84 → ECEF (for CesiumJS globe rendering). */
export function toECEF(lon: number, lat: number, h: number): [number, number, number] {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  return [
    (N + h) * Math.cos(φ) * Math.cos(λ),
    (N + h) * Math.cos(φ) * Math.sin(λ),
    (N * (1 - e2) + h) * Math.sin(φ),
  ];
}

/** Build POLYHEDRALSURFACE Z EWKT from a closed ring + z range. */
export function polyhedralEWKT(ring: number[][], zMin: number, zMax: number): string {
  const bottom = ring.map(([x, y]) => `${x} ${y} ${zMin}`).join(', ');
  const top = ring.map(([x, y]) => `${x} ${y} ${zMax}`).join(', ');
  const walls: string[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    walls.push(
      `(${x1} ${y1} ${zMin}, ${x2} ${y2} ${zMin}, ${x2} ${y2} ${zMax}, ${x1} ${y1} ${zMax}, ${x1} ${y1} ${zMin})`
    );
  }
  return `POLYHEDRALSURFACE Z((${bottom}), (${top}), ${walls.join(', ')})`;
}

// ─── Centre coordinates (Delhi NCR) ────────────────────────────
const CLon = 77.2090;
const CLat = 28.6130;
const BDx = 0.00022; // ~22 m half-width
const BDy = 0.00016; // ~18 m half-depth

// ─── Spatial config ────────────────────────────────────────────
export const config: SpatialConfig = {
  srid: 32643,
  vertical_ref: 'ellipsoidal',
  unit: 'metre',
};

// ─── Parcel ────────────────────────────────────────────────────
export const parcel: Parcel = {
  id: 'parcel-001',
  ulpin: '29384756102934',
  name: 'Sector 48 · Plot A-12',
  area_sqm: 4800,
  srid: 4326,
};

// ─── Building ──────────────────────────────────────────────────
const towerOwnership = {
  ownerName: 'Asteria Residential Cooperative Society',
  ownershipType: 'Freehold · Cooperative title',
  tenure: 'Perpetual',
  share: '100% building common title',
  lastVerified: '2026-02-14',
};

const towerValuation = {
  marketValue: 184000000,
  assessedValue: 146500000,
  currency: 'INR',
  valuationYear: 2026,
  method: 'Income + comparable sales',
  confidence: 0.91,
};

function floorValuation(area: number, level: number) {
  const rate = level === -1 ? 58000 : level === 0 ? 145000 : 132000;
  return {
    marketValue: area * rate,
    assessedValue: area * rate * 0.8,
    currency: 'INR',
    valuationYear: 2026,
    method: 'Area-rate assessment',
    confidence: level === -1 ? 0.86 : 0.89,
  };
}

export const building: Building = {
  id: 'bldg-001',
  parcel_id: 'parcel-001',
  name: 'Tower A — Residential',
  height_m: 36,
  height_source: 'LIDAR',
  floors_count: 12,
  footprint: rectFootprint(CLon, CLat, BDx, BDy),
  ownership: towerOwnership,
  valuation: towerValuation,
};

// ─── Floors ────────────────────────────────────────────────────
export const floors: Floor[] = [
  { id: 'fl-b01', building_id: 'bldg-001', code: 'B01', label: 'Basement 1 · Parking', z_min: -3.5, z_max: 0, area_sqm: 420, ownership: { ...towerOwnership, ownershipType: 'Common area title' }, valuation: floorValuation(420, -1) },
  { id: 'fl-f00', building_id: 'bldg-001', code: 'F00', label: 'Ground · Lobby + Commercial', z_min: 0, z_max: 3.5, area_sqm: 380, ownership: { ...towerOwnership, ownershipType: 'Common + commercial title' }, valuation: floorValuation(380, 0) },
  { id: 'fl-f01', building_id: 'bldg-001', code: 'F01', label: 'First Floor', z_min: 3.5, z_max: 6.5, area_sqm: 400, ownership: { ...towerOwnership, ownershipType: 'Apartment strata title' }, valuation: floorValuation(400, 1) },
  { id: 'fl-f02', building_id: 'bldg-001', code: 'F02', label: 'Second Floor', z_min: 6.5, z_max: 9.5, area_sqm: 400, ownership: { ...towerOwnership, ownershipType: 'Apartment strata title' }, valuation: floorValuation(400, 1) },
  { id: 'fl-f03', building_id: 'bldg-001', code: 'F03', label: 'Third Floor', z_min: 9.5, z_max: 12.5, area_sqm: 400, ownership: { ...towerOwnership, ownershipType: 'Apartment strata title' }, valuation: floorValuation(400, 1) },
  { id: 'fl-f04', building_id: 'bldg-001', code: 'F04', label: 'Fourth Floor', z_min: 12.5, z_max: 15.5, area_sqm: 400, ownership: { ...towerOwnership, ownershipType: 'Apartment strata title' }, valuation: floorValuation(400, 1) },
  { id: 'fl-f05', building_id: 'bldg-001', code: 'F05', label: 'Fifth Floor', z_min: 15.5, z_max: 18.5, area_sqm: 400, ownership: { ...towerOwnership, ownershipType: 'Apartment strata title' }, valuation: floorValuation(400, 1) },
  { id: 'fl-f06', building_id: 'bldg-001', code: 'F06', label: 'Sixth Floor', z_min: 18.5, z_max: 21.5, area_sqm: 400, ownership: { ...towerOwnership, ownershipType: 'Apartment strata title' }, valuation: floorValuation(400, 1) },
];

// ─── Units ─────────────────────────────────────────────────────
// Unit slots are positioned to avoid overlaps
// Each slot: dx/dy = offset from center, w/h = width/height in degrees
const unitSlots = [
  { dx: -0.00012, dy: -0.00009, w: 0.00008, h: 0.00006 },  // Bottom-left
  { dx:  0.00012, dy: -0.00009, w: 0.00008, h: 0.00006 },  // Bottom-right
  { dx: -0.00012, dy:  0.00009, w: 0.00008, h: 0.00006 },  // Top-left
  { dx:  0.00012, dy:  0.00009, w: 0.00008, h: 0.00006 },  // Top-right
];

export const units: Unit[] = [];

// Basement parking
floors[0] && unitSlots.forEach((s, i) => {
  const id = `u-b01-p${String(i + 1).padStart(2, '0')}`;
  units.push({
    id, floor_id: 'fl-b01', code: `P${String(i + 1).padStart(2, '0')}`,
    type: 'parking', label: `Parking Bay ${i + 1}`,
    area_sqm: 12.5, volume_cum: 43.75,
    footprint: rectFootprint(CLon + s.dx, CLat + s.dy, s.w, s.h),
    hash: fakeHash(id + ':v1'), version: 1,
  });
});

// Ground floor commercial + lobby
{
  const gf = floors[1];
  // Lobby is centered and sized to fit in the gap between shops without overlap
  // Lobby size reduced to 0.000035 × 0.000025 to ensure no overlap with shops
  units.push({
    id: 'u-f00-lobby', floor_id: gf.id, code: 'C00',
    type: 'lobby', label: 'Main Lobby',
    area_sqm: 30, volume_cum: 105,
    footprint: rectFootprint(CLon, CLat, 0.000035, 0.000025),
    hash: fakeHash('u-f00-lobby:v1'), version: 1,
  });
  unitSlots.forEach((s, i) => {
    const id = `u-f00-c${String(i + 1).padStart(2, '0')}`;
    units.push({
      id, floor_id: gf.id, code: `C${String(i + 1).padStart(2, '0')}`,
      type: 'commercial', label: `Shop ${i + 1}`,
      area_sqm: 28 + i * 4, volume_cum: (28 + i * 4) * 3.5,
      footprint: rectFootprint(CLon + s.dx, CLat + s.dy, s.w, s.h),
      hash: fakeHash(id + ':v1'), version: 1,
    });
  });
}

// Residential floors F01-F06
for (let fi = 2; fi < floors.length; fi++) {
  const fl = floors[fi];
  unitSlots.forEach((s, i) => {
    const code = `U${String(i + 1).padStart(2, '0')}`;
    const id = `u-${fl.code.toLowerCase()}-${code.toLowerCase()}`;
    units.push({
      id, floor_id: fl.id, code,
      type: 'apartment', label: `Flat ${fl.code}${String.fromCharCode(65 + i)}${i + 1}`,
      area_sqm: 85 + i * 12, volume_cum: (85 + i * 12) * 3.0,
      footprint: rectFootprint(CLon + s.dx, CLat + s.dy, s.w, s.h),
      hash: fakeHash(id + ':v1'), version: 1,
    });
  });
}

// ─── Spatial identifiers ───────────────────────────────────────
export const spatialIDs: SpatialID[] = units.map((u) => {
  const fl = floors.find((f) => f.id === u.floor_id)!;
  return {
    id: `sid-${u.id}`,
    full: `${parcel.ulpin}-B01-${fl.code}-${u.code}-V0${u.version}`,
    ulpin: parcel.ulpin,
    bldg: 'B01',
    floor: fl.code,
    unit: u.code,
    version: u.version,
    hash: u.hash,
    unit_id: u.id,
  };
});

// ─── Validation checks ─────────────────────────────────────────
export const validationChecks: ValidationCheck[] = [
  { id: 'vc-01', code: 'CONTAINMENT', label: 'Unit ⊂ Floor ⊂ Building', severity: 'HIGH', passed: true, detail: `All ${units.length} units contained within parent floors` },
  { id: 'vc-02', code: 'NO_3D_OVERLAP', label: 'ST_3DIntersects = false ∀ pairs', severity: 'HIGH', passed: true, detail: 'No volumetric overlap between any unit pair' },
  { id: 'vc-03', code: 'CRS_CONSISTENT', label: 'SRID uniformity', severity: 'HIGH', passed: true, detail: `All geometries → SRID ${config.srid}` },
  { id: 'vc-04', code: 'VERTICAL_DATUM', label: 'Vertical reference = ellipsoidal', severity: 'HIGH', passed: true, detail: 'Ellipsoidal heights across all entities' },
  { id: 'vc-05', code: 'HASH_INTEGRITY', label: 'SHA-256 geometry hash', severity: 'MEDIUM', passed: true, detail: `${units.length} hashes verified at persist time` },
  { id: 'vc-06', code: 'ID_UNIQUE', label: '3D identifier uniqueness', severity: 'HIGH', passed: true, detail: `${spatialIDs.length} unique identifiers generated` },
  { id: 'vc-07', code: 'AREA_POSITIVE', label: 'Area > 0 ∀ units', severity: 'MEDIUM', passed: true, detail: 'All unit areas positive and non-degenerate' },
  { id: 'vc-08', code: 'SOLID_CLOSED', label: 'PolyhedralSurface closure', severity: 'MEDIUM', passed: true, detail: 'All solids are watertight (2 caps + N walls)' },
];

// ─── AI proposal ───────────────────────────────────────────────
export const aiProposal: AIProposal = {
  id: 'aip-001',
  primary_model: 'SegFormer / MiT-B0',
  verifier_model: 'DeepLabV3 / ResNet-50',
  iou: 0.94,
  agreement: 0.91,
  status: 'REVIEW_REQUIRED',
  footprint_proposed: rectFootprint(CLon, CLat, BDx, BDy),
  footprint_verified: rectFootprint(CLon, CLat, BDx * 0.97, BDy * 0.97),
};

// ─── Import audit ──────────────────────────────────────────────
export const importAudit: ImportAudit = {
  id: 'imp-001',
  status: 'PERSISTED',
  files: ['parcel_sector48.geojson', 'buildings_tower_a.geojson', 'floors_tower_a.csv', 'units_tower_a.geojson'],
  source_crs: 'EPSG:4326',
  target_srid: 32643,
  ids_generated: spatialIDs.length,
  at: '2024-03-01T11:55:03Z',
};

// ─── Users ─────────────────────────────────────────────────────
export const users: AppUser[] = [
  { id: 'u1', username: 'admin', role: 'admin', name: 'System Administrator' },
  { id: 'u2', username: 'rajesh.k', role: 'surveyor', name: 'Rajesh Kumar' },
  { id: 'u3', username: 'priya.s', role: 'reviewer', name: 'Priya Sharma' },
  { id: 'u4', username: 'amit.p', role: 'viewer', name: 'Amit Patel' },
];
