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

export async function loadLiveHierarchy(): Promise<LiveHierarchy> {
  const [bRes, fRes, uRes, pRes, sRes] = await Promise.all([
    api.getBuildings(),
    api.getFloors(),
    api.getUnits(),
    api.getParcels(),
    api.getSpatialIdentifiers(),
  ]);
  const named = [
    ['buildings', bRes],
    ['floors', fRes],
    ['units', uRes],
    ['parcels', pRes],
    ['spatial-identifiers', sRes],
  ] as const;
  for (const [name, r] of named) {
    if (!r.success || !Array.isArray(r.data)) throw new Error(`live ${name} unavailable`);
  }
  const rawBuildings = bRes.data as unknown[];
  const rawFloors = fRes.data as unknown[];
  const rawUnits = uRes.data as unknown[];
  const rawParcels = pRes.data as unknown[];
  const rawSids = sRes.data as unknown[];
  if (rawBuildings.length === 0) throw new Error('no buildings');

  const rb = rawBuildings[0] as Record<string, unknown>;
  const building: Building = {
    id: reqStr(rb.id, 'building.id'),
    parcel_id: reqStr(rb.parcel_id, 'building.parcel_id'),
    name: reqStr(rb.name, 'building.name'),
    height_m: reqNum(rb.height_m, 'building.height_m'),
    height_source: reqStr(rb.height_source, 'building.height_source') as Building['height_source'],
    floors_count: reqNum(rb.floors_count, 'building.floors_count'),
    footprint: ringOf(rb.footprint, 'building.footprint'),
  };

  const parcelRaw = (rawParcels as Record<string, unknown>[]).find((p) => p.id === building.parcel_id)
    ?? (rawParcels[0] as Record<string, unknown> | undefined);
  if (!parcelRaw) throw new Error('no parcels');
  const parcel: Parcel = {
    id: reqStr(parcelRaw.id, 'parcel.id'),
    ulpin: reqStr(parcelRaw.ulpin, 'parcel.ulpin'),
    name: reqStr(parcelRaw.name, 'parcel.name'),
    area_sqm: reqNum(parcelRaw.area_sqm, 'parcel.area_sqm'),
    srid: reqNum(parcelRaw.srid, 'parcel.srid'),
  };

  const floors: Floor[] = (rawFloors as Record<string, unknown>[])
    .filter((f) => f.building_id === building.id)
    .map((f) => ({
      id: reqStr(f.id, 'floor.id'),
      building_id: reqStr(f.building_id, 'floor.building_id'),
      code: reqStr(f.floor_code, 'floor.code'),
      label: reqStr(f.floor_label, 'floor.label'),
      z_min: reqNum(f.z_min, 'floor.z_min'),
      z_max: reqNum(f.z_max, 'floor.z_max'),
      area_sqm: reqNum(f.area_sqm, 'floor.area_sqm'),
    }))
    .sort((a, b) => a.z_min - b.z_min);
  if (floors.length === 0) throw new Error('no floors for building');

  const floorIds = new Set(floors.map((f) => f.id));
  const units: Unit[] = (rawUnits as Record<string, unknown>[])
    .filter((u) => typeof u.floor_id === 'string' && floorIds.has(u.floor_id))
    .map((u) => ({
      id: reqStr(u.id, 'unit.id'),
      floor_id: reqStr(u.floor_id, 'unit.floor_id'),
      code: reqStr(u.unit_code, 'unit.code'),
      type: mapUnitType(u.unit_type),
      label: reqStr(u.label, 'unit.label'),
      area_sqm: reqNum(u.area_sqm, 'unit.area_sqm'),
      volume_cum: reqNum(u.volume_cum, 'unit.volume_cum'),
      footprint: ringOf(u.footprint, 'unit.footprint'),
      hash: reqStr(u.geometry_hash, 'unit.hash'),
      version: Math.trunc(reqNum(u.geometry_version, 'unit.version')),
    }));
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

  return { parcel, building, floors, units, spatialIDs, buildingCount: rawBuildings.length };
}
