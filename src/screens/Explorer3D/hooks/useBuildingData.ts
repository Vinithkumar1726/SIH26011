/**
 * SIH26011 - Explorer3D Building Data Hook
 * Loads and manages building/floor/unit data from backend
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { api } from '../../../api';
import type { Building, Floor, Unit, SpatialID, BuildingSummary, CityBuilding, LiveHierarchy, OsmBuilding } from '../../workspace3d/types';
import { loadLiveHierarchy, fetchCityBuildings, isCadastralBuilding } from '../../workspace3d/api';
import { ringOrigin, footprintToLocal } from '../../workspace3d/data';
import { generatePolyhedralSolid, validateTopology, type Solid3D } from '../../workspace3d/geo';

export function useBuildingData() {
  const [source, setSource] = useState<'loading' | 'live' | 'demo'>('loading');
  const [liveData, setLiveData] = useState<LiveHierarchy | null>(null);
  const [summaries, setSummaries] = useState<BuildingSummary[]>([]);
  const [cityBuildings, setCityBuildings] = useState<CityBuilding[]>([]);
  const [liveParcels, setLiveParcels] = useState<Array<{
    parcel_id: string;
    height_m: number;
    footprint: { type: string; coordinates: number[][][] } | null;
    encroachment?: boolean;
    elevation_msl_m?: number;
  }>>([]);
  const [cityMeta, setCityMeta] = useState<{ origin: { lon: number; lat: number }; radiusM: number } | null>(null);
  const [osmCatalog, setOsmCatalog] = useState<OsmBuilding[] | null>(null);
  const [subUtils, setSubUtils] = useState<any[]>([]);
  
  const originRef = useRef<[number, number]>([0, 0]);
  
  // Load live hierarchy on mount
  useEffect(() => {
    let cancelled = false;
    loadLiveHierarchy()
      .then((d) => {
        if (cancelled) return;
        setLiveData(d);
        setSummaries(d.summaries);
        setSource('live');
        originRef.current = ringOrigin(d.building.footprint);
      })
      .catch(() => {
        if (!cancelled) setSource('demo');
      });
    return () => { cancelled = true; };
  }, []);
  
  // Load city buildings
  useEffect(() => {
    let cancelled = false;
    fetchCityBuildings()
      .then((list) => {
        if (!cancelled) setCityBuildings(list);
      })
      .catch(() => { /* empty */ });
    return () => { cancelled = true; };
  }, []);
  
  // Load city meta
  useEffect(() => {
    let cancelled = false;
    fetch('/coimbatore/meta.json')
      .then((r) => {
        if (!r.ok) throw new Error('no city meta');
        return r.json();
      })
      .then((j) => {
        if (cancelled) return;
        const o = (j as { origin?: { lon?: unknown; lat?: unknown }; radiusM?: unknown })?.origin;
        if (typeof o?.lon !== 'number' || typeof o?.lat !== 'number' || typeof j?.radiusM !== 'number') return;
        setCityMeta({ origin: { lon: o.lon, lat: o.lat }, radiusM: j.radiusM });
      })
      .catch(() => { /* no city context */ });
    return () => { cancelled = true; };
  }, []);
  
  // Load OSM catalog
  useEffect(() => {
    if (!cityMeta) return;
    let cancelled = false;
    fetch('/coimbatore/buildings_catalog.json')
      .then((r) => {
        if (!r.ok) throw new Error('no catalog');
        return r.json();
      })
      .then((j) => {
        if (cancelled || !Array.isArray(j)) return;
        const list: OsmBuilding[] = [];
        for (const r of j as Record<string, unknown>[]) {
          const fp = r.footprint;
          if (typeof r.id !== 'string' || !Array.isArray(fp)) continue;
          const pts = (fp as unknown[]).filter(
            (p): p is [number, number] => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number',
          );
          if (pts.length < 3) continue;
          if (typeof r.height !== 'number' || !Number.isFinite(r.height)) continue;
          let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, cx = 0, cz = 0;
          for (const [x, z] of pts) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
            cx += x;
            cz += z;
          }
          list.push({
            id: r.id,
            name: typeof r.name === 'string' ? r.name : '',
            type: typeof r.type === 'string' ? r.type : '',
            levels: typeof r.levels === 'number' ? r.levels : null,
            height: r.height,
            heightSource: typeof r.heightSource === 'string' ? r.heightSource : '',
            area: typeof r.area === 'number' && Number.isFinite(r.area) ? r.area : NaN,
            footprint: pts,
            minX, maxX, minZ, maxZ,
            cx: cx / pts.length,
            cz: cz / pts.length,
          });
        }
        if (!cancelled && list.length > 0) setOsmCatalog(list);
      })
      .catch(() => { /* OSM unavailable */ });
    return () => { cancelled = true; };
  }, [cityMeta]);
  
  // Derived data
  const data = liveData ?? null;
  const building = data?.building;
  const floors = data?.floors ?? [];
  const units = data?.units ?? [];
  const spatialIDs = data?.spatialIDs ?? [];
  
  const origin = useMemo(() => building ? ringOrigin(building.footprint) : [0, 0], [building]);
  
  const footprintShape = useMemo(() => {
    if (!building) return null;
    const pts = footprintToLocal(building.footprint, origin[0], origin[1]);
    const closedDup = pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
    const ring = closedDup ? pts.slice(0, -1) : pts;
    const shape = new THREE.Shape();
    ring.forEach(([x, y], i) => {
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    return shape;
  }, [building, origin]);
  
  // Neighbour buildings
  const neighbours = useMemo(() => {
    if (source !== 'live' || !building) return [];
    return cityBuildings
      .filter((b) => b.id !== building.id && isCadastralBuilding(b))
      .map((b) => {
        const o = ringOrigin(b.footprint);
        const off = footprintToLocal([[o[0], o[1]]], origin[0], origin[1])[0];
        const pts = footprintToLocal(b.footprint, origin[0], origin[1]);
        let a = 0;
        for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
        return { ...b, ox: off[0], oy: off[1], dist: Math.hypot(off[0], off[1]), area: Math.abs(a / 2) };
      })
      .filter((n) => n.dist <= 1500)
      .sort((x, y) => x.dist - y.dist)
      .slice(0, 40);
  }, [source, cityBuildings, building, origin]);
  
  // City offset
  const cityOffset = useMemo(() => {
    if (!cityMeta) return null;
    return footprintToLocal(
      [[cityMeta.origin.lon, cityMeta.origin.lat]],
      origin[0],
      origin[1],
    )[0];
  }, [cityMeta, origin]);
  
  const cityAvailable = cityMeta !== null;
  const cityVisible = cityAvailable && cityOffset !== null && Math.hypot(cityOffset[0], cityOffset[1]) <= (cityMeta?.radiusM ?? 0);
  
  // Building pipes
  const buildingPipes = useMemo(() => {
    if (!building) return [];
    // Import SYNTHETIC_PIPES dynamically to avoid circular deps
    return [];
  }, [building]);
  
  // Foundation box for pipe clearance
  const foundation = useMemo(() => {
    if (!buildingPipes.length || !building) return null;
    const pts = footprintToLocal(building.footprint, origin[0], origin[1]);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const minZ = Math.min(...floors.map((f) => f.z_min));
    if (!(minZ < 0)) return null;
    return { min: [minX, minZ, -maxY], max: [maxX, 0, -minY] };
  }, [buildingPipes, building, floors, origin]);
  
  // Pipe status
  const pipeStatus = useMemo(() => {
    if (!cityVisible || !cityOffset || !foundation) return [];
    return buildingPipes.map((p) => {
      const gx = cityOffset[0], gz = -cityOffset[1];
      const a = [gx + p.a[0], -p.depthM, gz + p.a[1]];
      const b = [gx + p.b[0], -p.depthM, gz + p.b[1]];
      const dist = segBoxDist(a, b, foundation);
      return { id: p.id, depth: p.depthM, dist, status: classifyClearance(dist) };
    });
  }, [buildingPipes, foundation, cityVisible, cityOffset]);
  
  // Live parcels polling
  const epochBounds = useMemo(() => ({
    min: Date.UTC(2015, 0, 1),
    max: Date.now(),
  }), []);
  
  const [targetEpochMs, setTargetEpochMs] = useState<number>(epochBounds.max);
  const isHistorical = targetEpochMs < epochBounds.max - 60000;
  
  // Debounced temporal fetch
  useEffect(() => {
    if (!cityVisible) return;
    if (!isHistorical) {
      const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
      fetch(`${base}/api/cadastral-parcels`)
        .then((r) => { if (!r.ok) throw new Error('no live parcels'); return r.json(); })
        .then((list) => { if (Array.isArray(list)) setLiveParcels(list); })
        .catch(() => { /* keep current */ });
      return;
    }
    const timer = window.setTimeout(() => {
      const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
      fetch(`${base}/api/v2/parcels/temporal?target_epoch=${new Date(targetEpochMs).toISOString()}`)
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((fc) => {
          const feats = Array.isArray(fc?.features) ? fc.features : [];
          setLiveParcels(feats.map((f: any) => ({
            parcel_id: f.properties?.parcel_id,
            height_m: f.properties?.height_m ?? 12,
            footprint: f.geometry ?? null,
          })));
        })
        .catch(() => { /* keep current */ });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [cityVisible, isHistorical, targetEpochMs]);
  
  // Live re-poll
  useEffect(() => {
    if (!cityVisible || isHistorical) return;
    let cancelled = false;
    const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const timer = setInterval(() => {
      fetch(`${base}/api/cadastral-parcels`)
        .then((r) => { if (!r.ok) throw new Error('no live parcels'); return r.json(); })
        .then((list) => { if (!cancelled && Array.isArray(list)) setLiveParcels(list); })
        .catch(() => { /* empty */ });
    }, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [cityVisible, isHistorical]);
  
  // Subterranean utilities
  useEffect(() => {
    if (!cityVisible) return;
    let cancelled = false;
    const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const o = cityMeta?.origin ?? { lon: origin[0], lat: origin[1] };
    const r = cityMeta?.radiusM ?? 1400;
    const dLat = r / 111320;
    const dLon = r / (111320 * Math.cos((o.lat * Math.PI) / 180));
    fetch(`${base}/api/v2/utilities/subterranean?bbox=${o.lon - dLon},${o.lat - dLat},${o.lon + dLon},${o.lat + dLat}`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((fc) => { if (!cancelled && Array.isArray(fc?.features)) setSubUtils(fc.features); })
      .catch(() => { /* empty */ });
    return () => { cancelled = true; };
  }, [cityVisible, cityMeta, origin]);
  
  return {
    source,
    setSource,
    liveData,
    setLiveData,
    summaries,
    setSummaries,
    cityBuildings,
    setCityBuildings,
    liveParcels,
    setLiveParcels,
    cityMeta,
    setCityMeta,
    osmCatalog,
    setOsmCatalog,
    subUtils,
    setSubUtils,
    origin: originRef.current,
    data,
    building,
    floors,
    units,
    spatialIDs,
    origin,
    footprintShape,
    neighbours,
    cityOffset,
    cityAvailable,
    cityVisible,
    buildingPipes,
    foundation,
    pipeStatus,
    targetEpochMs,
    setTargetEpochMs,
    isHistorical,
    epochBounds,
  };
}