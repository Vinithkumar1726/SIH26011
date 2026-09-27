import { useEffect, useState } from 'react';
import { api, type GeometryData } from '../api';
import type { Parcel, Building, Floor, Unit, SpatialID } from '../workspace3d/types';
import { footprintToLocal } from '../workspace3d/data';
import { generatePolyhedralSolid, type Solid3D, validateTopology } from '../workspace3d/geo';

const CENTER_LON = 77.209;
const CENTER_LAT = 28.613;

interface ExplorerData {
  parcel: Parcel | null;
  building: Building | null;
  floors: Floor[];
  units: Unit[];
  spatialIDs: SpatialID[];
  loading: boolean;
  error: string | null;
}

export function useExplorerData(): ExplorerData & { refetch: () => void } {
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [spatialIDs, setSpatialIDs] = useState<SpatialID[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch 3D geometry from API
      const geomResult = await api.get3DGeometry();
      if (!geomResult.success || !geomResult.data) {
        throw new Error(geomResult.error || 'Failed to load geometry');
      }
      const geomData = geomResult.data as GeometryData;

      // Fetch spatial identifiers
      const sidResult = await api.getSpatialIdentifiers();
      const spatialIDsData: any[] = (sidResult.success && sidResult.data) ? sidResult.data : [];

      // Transform parcel
      if (geomData.parcels.length > 0) {
        const p = geomData.parcels[0];
        setParcel({
          id: p.id,
          ulpin: p.ulpin,
          name: p.name,
          area_sqm: p.area_sqm,
          srid: p.srid,
        });
      }

      // Transform building
      if (geomData.buildings.length > 0) {
        const b = geomData.buildings[0];
        const footprintCoords = b.footprint?.coordinates?.[0] || [];
        setBuilding({
          id: b.id,
          parcel_id: b.parcel_id,
          name: b.name,
          height_m: b.height_m,
          height_source: b.height_source,
          floors_count: b.floors_count,
          footprint: footprintCoords,
          ownership: {
            ownerName: 'Asteria Residential Cooperative Society',
            ownershipType: 'Freehold · Cooperative title',
            tenure: 'Perpetual',
            share: '100% building common title',
            lastVerified: '2026-02-14',
          },
          valuation: {
            marketValue: 184000000,
            assessedValue: 146500000,
            currency: 'INR',
            valuationYear: 2026,
            method: 'Income + comparable sales',
            confidence: 0.91,
          },
        });
      }

      // Transform floors
      const transformedFloors: Floor[] = geomData.floors.map((f) => ({
        id: f.id,
        building_id: f.building_id,
        code: f.floor_code,
        label: f.floor_label,
        z_min: f.z_min,
        z_max: f.z_max,
        area_sqm: f.area_sqm,
        ownership: {
          ownerName: 'Asteria Residential Cooperative Society',
          ownershipType: f.floor_code === 'B01' ? 'Common area title' : f.floor_code === 'F00' ? 'Common + commercial title' : 'Apartment strata title',
          tenure: 'Perpetual',
          share: '100%',
          lastVerified: '2026-02-14',
        },
        valuation: {
          marketValue: f.area_sqm * (f.floor_code === 'B01' ? 58000 : f.floor_code === 'F00' ? 145000 : 132000),
          assessedValue: f.area_sqm * (f.floor_code === 'B01' ? 58000 : f.floor_code === 'F00' ? 145000 : 132000) * 0.8,
          currency: 'INR',
          valuationYear: 2026,
          method: 'Area-rate assessment',
          confidence: f.floor_code === 'B01' ? 0.86 : 0.89,
        },
      }));
      setFloors(transformedFloors);

      // Transform units
      const transformedUnits: Unit[] = geomData.units.map((u) => {
        const footprintCoords = u.footprint?.coordinates?.[0] || [];
        const localFootprint = footprintToLocal(footprintCoords, CENTER_LON, CENTER_LAT);
        
        // Generate solid for volume calculation if not present
        let volume = u.volume_cum;
        if (!volume && u.solid_geom) {
          // Volume could be calculated from solid_geom if needed
        }
        
        return {
          id: u.id,
          floor_id: u.floor_id,
          code: u.unit_code,
          type: u.unit_type,
          label: u.label,
          area_sqm: u.area_sqm,
          volume_cum: volume,
          footprint: footprintCoords,
          hash: u.geometry_hash,
          version: u.geometry_version,
        };
      });
      setUnits(transformedUnits);

      // Transform spatial identifiers
      const transformedSIDs: SpatialID[] = spatialIDsData.map((s) => ({
        id: s.id,
        full: s.identifier_string,
        ulpin: s.ulpin,
        bldg: s.building_code,
        floor: s.floor_code,
        unit: s.unit_code,
        version: s.version,
        hash: s.geometry_hash,
        unit_id: s.property_unit_id,
      }));
      setSpatialIDs(transformedSIDs);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    parcel,
    building,
    floors,
    units,
    spatialIDs,
    loading,
    error,
    refetch: fetchData,
  };
}

// Helper to compute conflicts from current data
export function useConflicts(floors: Floor[], units: Unit[]) {
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (units.length === 0) return;
    
    const solids = units.map(u => {
      const floor = floors.find(f => f.id === u.floor_id);
      if (!floor) return null;
      const localFootprint = footprintToLocal(u.footprint, CENTER_LON, CENTER_LAT);
      return {
        id: u.id,
        floor_id: u.floor_id,
        solid: generatePolyhedralSolid(
          { coordinates: localFootprint as [number, number][] },
          floor.z_min,
          floor.z_max
        )
      };
    }).filter(Boolean) as { id: string; floor_id: string; solid: Solid3D }[];
    
    const result = validateTopology(solids);
    const conflictIds = new Set<string>();
    result.issues.forEach(issue => {
      if (issue.code === 'OVERLAP_DETECTED' && issue.entity_id) {
        const ids = issue.entity_id.split(',').map(id => id.trim());
        ids.forEach(id => conflictIds.add(id));
      }
    });
    setConflicts(conflictIds);
  }, [floors, units]);

  return conflicts;
}