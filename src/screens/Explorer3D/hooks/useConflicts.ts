/**
 * SIH26011 - Explorer3D Conflict Detection Hook
 * Computes 3D topology conflicts between units
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Unit, Floor } from '../../workspace3d/types';
import { footprintToLocal } from '../../workspace3d/data';
import { generatePolyhedralSolid, validateTopology, type Solid3D } from '../../workspace3d/geo';

interface ConflictInfo {
  ids: string[];
  volume?: number;
}

export function useConflicts(
  floors: Floor[],
  units: Unit[],
  origin: [number, number]
) {
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [overlapDetails, setOverlapDetails] = useState<ConflictInfo[]>([]);
  
  // Recompute conflicts when data changes
  useEffect(() => {
    if (units.length === 0) return;
    
    const solids = units.map(u => {
      const floor = floors.find(f => f.id === u.floor_id)!;
      const localFootprint = footprintToLocal(u.footprint, origin[0], origin[1]);
      return {
        id: u.id,
        floor_id: u.floor_id,
        solid: generatePolyhedralSolid(
          { coordinates: localFootprint as [number, number][] },
          floor.z_min,
          floor.z_max
        )
      };
    });
    
    const result = validateTopology(solids);
    const conflictIds = new Set<string>();
    const details: ConflictInfo[] = [];
    
    result.issues.forEach(issue => {
      if (issue.code === 'OVERLAP_DETECTED' && issue.entity_id) {
        const ids = issue.entity_id.split(',').map(id => id.trim());
        ids.forEach(id => conflictIds.add(id));
        details.push({ ids, volume: issue.overlap_volume });
      }
    });
    
    setConflicts(conflictIds);
    setOverlapDetails(details);
  }, [floors, units, origin]);
  
  const hasConflict = useCallback((unitId: string) => conflicts.has(unitId), [conflicts]);
  
  const getConflictDetails = useCallback((unitId: string) => 
    overlapDetails.find(d => d.ids.includes(unitId)), [overlapDetails]);
  
  return {
    conflicts,
    overlapDetails,
    hasConflict,
    getConflictDetails,
  };
}