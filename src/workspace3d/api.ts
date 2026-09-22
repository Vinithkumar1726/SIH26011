/**
 * SIH26011 — live backend adapter for the 3D explorer hierarchy.
 *
 * Read-only: fetches parcels, buildings, floors, units and spatial
 * identifiers from the FastAPI backend and maps them onto the existing
 * workspace3d types. Anything the backend does not return (ownership,
 * valuation) is left undefined so the UI can render "—".
 * Any network, HTTP or shape failure throws, and the caller falls back
 * to the static demo data.
 */

import { api } from '../api';
import type { Building, Floor, Parcel, SpatialID, Unit } from './types';

export interface LiveHierarchy {
  parcel: Parcel;
  building: Building;
  floors: Floor[];
  units: Unit[];
  spatialIDs: SpatialID[];
  buildingCount: number;
  summaries: BuildingSummary[];
}

export interface BuildingSummary {
  id: string;
  name: string;
  floorCount: number;
  unitCount: number;
}

function reqStr(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`bad ${field}`);
  return v;
}

function reqNum(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`bad ${field}`);
  return v;
}

function ringOf(geom: unknown, field: string): number[][] {
  if (!geom || typeof geom !== 'object') throw new Error(`missing ${field}`);
  const coords = (geom as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coords) || !Array.isArray(coords[0])) throw new Error(`bad ${field}`);
  const ring = coords[0] as unknown;
  if (!Array.isArray(ring) || ring.length < 4) throw new Error(`bad ${field} ring`);
  return ring as number[][];
}

function parcelOuterRing(geom: unknown): number[][] | undefined {
  if (!geom || typeof geom !== 'object') return undefined;
  const g = geom as { type?: unknown; coordinates?: unknown };
  if (g.type !== 'MultiPolygon' || !Array.isArray(g.coordinates)) return undefined;
  const firstPoly = (g.coordinates as unknown[])[0];
  if (!Array.isArray(firstPoly)) return undefined;
  const outer = (firstPoly as unknown[])[0];
  if (!Array.isArray(outer) || outer.length < 4) return undefined;
  return outer as number[][];
}
function mapUnitType(t: unknown): Unit['type'] {
  switch (t) {
    case 'apartment':
    case 'parking':
    case 'lobby':
      return t;
    case 'residential':
      return 'apartment';
    case 'retail':
    case 'office':
      return 'commercial';
    default:
      throw new Error(`unknown unit_type: ${String(t)}`);
  }
}

export async function fetchCityBuildings(): Promise<CityBuilding[]> {
  const r = await api.getBuildings();
  if (!r.success || !Array.isArray(r.data)) throw new Error('live buildings unavailable');
  const out: CityBuilding[] = [];
  for (const raw of r.data as Record<string, unknown>[]) {
    try {
      const h = raw.height_m;
      out.push({
        id: reqStr(raw.id, 'building.id'),
        name: typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : reqStr(raw.id, 'building.id'),
        height_m: typeof h === 'number' && Number.isFinite(h) && h > 0 ? h : 10,
        footprint: ringOf(raw.footprint, 'building.footprint'),
      });
    } catch {
      /* skip a malformed neighbour entry rather than dropping the whole layer */
    }
  }
  return out;
}

export interface CityBuilding {
  id: string;
  name: string;
  height_m: number;
  footprint: number[][];
}

export async function fetchBuildingSummaries(): Promise<BuildingSummary[]> {
  const [bRes, fRes, uRes] = await Promise.all([api.getBuildings(), api.getFloors(), api.getUnits()]);
  if (!bRes.success || !Array.isArray(bRes.data)) throw new Error('live buildings unavailable');
  if (!fRes.success || !Array.isArray(fRes.data)) throw new Error('live floors unavailable');
  if (!uRes.success || !Array.isArray(uRes.data)) throw new Error('live units unavailable');
  return summarize(
    bRes.data as Record<string, unknown>[],
    fRes.data as Record<string, unknown>[],
    uRes.data as Record<string, unknown>[],
  );
}

/** Synthetic OSM tile imports are not cadastral records: anything on the
 * tile parcel, or with an OSM way-style id, is excluded from cadastral
 * listings (dropdowns, trees, neighbour blocks). The OSM city-layer
 * click-select feature reads the static catalog directly and is unaffected. */
export function isCadastralBuilding(b: { id?: unknown; parcel_id?: unknown }): boolean {
  return b.parcel_id !== 'parcel-osm-coimbatore'
    && !(typeof b.id === 'string' && b.id.startsWith('w'));
}

function summarize(
  rawBuildings: Record<string, unknown>[],
  rawFloors: Record<string, unknown>[],
  rawUnits: Record<string, unknown>[],
): BuildingSummary[] {
  const floorIdsByBuilding = new Map<string, Set<string>>();
  for (const f of rawFloors) {
    if (typeof f.id !== 'string' || typeof f.building_id !== 'string') throw new Error('bad floor link');
    let set = floorIdsByBuilding.get(f.building_id);
    if (!set) {
      set = new Set();
      floorIdsByBuilding.set(f.building_id, set);
    }
    set.add(f.id);
  }
  return rawBuildings
    .filter((b) => isCadastralBuilding(b as { id?: unknown; parcel_id?: unknown }))
    .map((b) => {
    const id = reqStr(b.id, 'building.id');
    const floorIds = floorIdsByBuilding.get(id) ?? new Set<string>();
    const unitCount = rawUnits.filter((u) => typeof u.floor_id === 'string' && floorIds.has(u.floor_id)).length;
    return {
      id,
      name: typeof b.name === 'string' && b.name.length > 0 ? b.name : id,
      floorCount: floorIds.size,
      unitCount,
    };
  });
}

export function pickDefaultBuilding(sums: BuildingSummary[]): BuildingSummary {
  if (sums.length === 0) throw new Error('no buildings');
  return [...sums].sort(
    (a, b) => b.unitCount - a.unitCount || b.floorCount - a.floorCount || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )[0];
}

export async function loadLiveHierarchy(buildingId?: string): Promise<LiveHierarchy> {
  const [bRes, fRes, uRes, sRes] = await Promise.all([
    api.getBuildings(),
    api.getFloors(),
    api.getUnits(),
    api.getSpatialIdentifiers(),
  ]);
  const named = [
    ['buildings', bRes],
    ['floors', fRes],
    ['units', uRes],
    ['spatial-identifiers', sRes],
  ] as const;
  for (const [name, r] of named) {
    if (!r.success || !Array.isArray(r.data)) throw new Error(`live ${name} unavailable`);
  }
  const rawBuildings = bRes.data as unknown[];
  const rawFloors = fRes.data as unknown[];
  const rawUnits = uRes.data as unknown[];
  const rawSids = sRes.data as unknown[];
  if (rawBuildings.length === 0) throw new Error('no buildings');
  const summaries = summarize(
    rawBuildings as Record<string, unknown>[],
    rawFloors as Record<string, unknown>[],
    rawUnits as Record<string, unknown>[],
  );

  const wantId = buildingId ?? pickDefaultBuilding(summaries).id;
  const rb = (rawBuildings as Record<string, unknown>[]).find((x) => x.id === wantId) as
    | Record<string, unknown>
    | undefined;
  if (!rb) throw new Error(`building not found: ${wantId}`);
  const parcelId = reqStr(rb.parcel_id, 'building.parcel_id');

  // Hierarchy comes from the GeoJSON parcel endpoint (RFC 7946).
  const hRes = await api.getParcel(parcelId);
  if (!hRes.success) throw new Error('live parcel hierarchy unavailable');
  const fc = hRes.data as unknown;
  if (!fc || typeof fc !== 'object' || (fc as { type?: unknown }).type !== 'FeatureCollection') {
    throw new Error('bad parcel FeatureCollection');
  }
  const features = (fc as { features?: unknown }).features;
  if (!Array.isArray(features)) throw new Error('bad parcel features');
  const byKind = (kind: string) => features.filter(
    (f): f is Record<string, unknown> & { properties: Record<string, unknown> } =>
      !!f && typeof f === 'object'
      && (f as { type?: unknown }).type === 'Feature'
      && !!((f as { properties?: unknown }).properties)
      && typeof (f as { properties?: unknown }).properties === 'object'
      && ((f as { properties: { kind?: unknown } }).properties.kind === kind),
  );
  const polyGeom = (f: Record<string, unknown>, field: string) => {
    const g = (f as { geometry?: unknown }).geometry as {
      type?: unknown; coordinates?: unknown;
    } | null;
    if (g === null) return null;
    if (!g || typeof g !== 'object' || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) {
      throw new Error(`bad ${field} geometry`);
    }
    if (!Array.isArray(g.coordinates)) throw new Error(`bad ${field} coordinates`);
    return g;
  };

  const parcelFeat = byKind('parcel')[0];
  if (!parcelFeat) throw new Error('parcel feature missing');
  const pp = parcelFeat.properties;
  const parcel: Parcel = {
    id: reqStr(pp.id, 'parcel.id'),
    ulpin: reqStr(pp.ulpin, 'parcel.ulpin'),
    name: reqStr(pp.name, 'parcel.name'),
    area_sqm: reqNum(pp.area_sqm, 'parcel.area_sqm'),
    srid: reqNum(pp.srid, 'parcel.srid'),
    footprint: parcelOuterRing(polyGeom(parcelFeat, 'parcel.geometry')),
  };
  if (parcel.id !== parcelId) throw new Error('parcel mismatch');

  const bFeat = byKind('building').find((f) => f.properties.id === wantId);
  if (!bFeat) throw new Error(`building feature missing: ${wantId}`);
  const bp = bFeat.properties;
  const bGeom = polyGeom(bFeat, 'building.geometry');
  if (!bGeom) throw new Error('building geometry missing');
  const building: Building = {
    id: reqStr(bp.id, 'building.id'),
    parcel_id: reqStr(bp.parcel_id, 'building.parcel_id'),
    name: reqStr(bp.name, 'building.name'),
    height_m: reqNum(bp.height_m, 'building.height_m'),
    height_source: reqStr(bp.height_source, 'building.height_source') as Building['height_source'],
    floors_count: reqNum(bp.floors_count, 'building.floors_count'),
    footprint: ringOf(bGeom, 'building.footprint'),
  };

  const floors: Floor[] = byKind('floor')
    .filter((f) => f.properties.building_id === building.id)
    .map((f) => {
      const fp = f.properties;
      return {
        id: reqStr(fp.id, 'floor.id'),
        building_id: reqStr(fp.building_id, 'floor.building_id'),
        code: reqStr(fp.floor_code, 'floor.code'),
        label: reqStr(fp.floor_label, 'floor.label'),
        z_min: reqNum(fp.z_min, 'floor.z_min'),
        z_max: reqNum(fp.z_max, 'floor.z_max'),
        area_sqm: reqNum(fp.area_sqm, 'floor.area_sqm'),
      };
    })
    .sort((a, b) => a.z_min - b.z_min);
  if (floors.length === 0) throw new Error('no floors for building');

  const floorIds = new Set(floors.map((f) => f.id));
  const units: Unit[] = byKind('unit')
    .filter((f) => typeof f.properties.floor_id === 'string' && floorIds.has(f.properties.floor_id as string))
    .map((f) => {
      const up = f.properties;
      const ug = polyGeom(f, 'unit.geometry');
      if (!ug) throw new Error('unit geometry missing');
      return {
        id: reqStr(up.id, 'unit.id'),
        floor_id: reqStr(up.floor_id, 'unit.floor_id'),
        code: reqStr(up.unit_code, 'unit.code'),
        type: mapUnitType(up.unit_type),
        label: reqStr(up.label, 'unit.label'),
        area_sqm: reqNum(up.area_sqm, 'unit.area_sqm'),
        volume_cum: reqNum(up.volume_cum, 'unit.volume_cum'),
        footprint: ringOf(ug, 'unit.footprint'),
        hash: reqStr(up.geometry_hash, 'unit.hash'),
        version: Math.trunc(reqNum(up.geometry_version, 'unit.version')),
      };
    });
  if (units.length === 0) throw new Error('no units for building');

  const unitIds = new Set(units.map((u) => u.id));
  const spatialIDs: SpatialID[] = (rawSids as Record<string, unknown>[])
    .filter((s) => typeof s.property_unit_id === 'string' && unitIds.has(s.property_unit_id))
    .map((s) => ({
      id: reqStr(s.id, 'sid.id'),
      full: reqStr(s.identifier_string, 'sid.full'),
      ulpin: reqStr(s.ulpin, 'sid.ulpin'),
      bldg: reqStr(s.building_code, 'sid.bldg'),
      floor: reqStr(s.floor_code, 'sid.floor'),
      unit: reqStr(s.unit_code, 'sid.unit'),
      version: Math.trunc(reqNum(s.version, 'sid.version')),
      hash: reqStr(s.geometry_hash, 'sid.hash'),
      unit_id: reqStr(s.property_unit_id, 'sid.unit_id'),
    }));

  return { parcel, building, floors, units, spatialIDs, buildingCount: rawBuildings.length, summaries };
}
