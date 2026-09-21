import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Building, Floor, Unit } from '../workspace3d/types';
import { building as demoBuilding, floors as demoFloors, footprintToLocal, parcel as demoParcel, spatialIDs as demoSpatialIDs, units as demoUnits } from '../workspace3d/data';
import { loadLiveHierarchy, type BuildingSummary, type LiveHierarchy } from '../workspace3d/api';
import { generatePolyhedralSolid, type Solid3D, validateTopology } from '../workspace3d/geo';

function ringOrigin(ring: number[][]): [number, number] {
  const closed = ring.length > 1
    && ring[0][0] === ring[ring.length - 1][0]
    && ring[0][1] === ring[ring.length - 1][1];
  const pts = closed ? ring.slice(0, -1) : ring;
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
}

function footprintSpanM(ring: number[][], lon0: number, lat0: number): number {
  const pts = footprintToLocal(ring, lon0, lat0);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return Math.max(maxX - minX, maxY - minY);
}

const DEMO_ORIGIN = ringOrigin(demoBuilding.footprint);
const DEMO_SPAN_M = footprintSpanM(demoBuilding.footprint, DEMO_ORIGIN[0], DEMO_ORIGIN[1]);
const DEMO_HEIGHT_M = demoBuilding.height_m;

// Backend volume_cum is degenerate (computed in degrees, ~1e-7 m³) and needs
// fixing at source; show "—" instead of a false number.
function volumeText(v: number): string {
  return v < 0.01 ? '—' : `${v.toFixed(1)} m³`;
}

function formatReportCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function downloadCsv(bldg: Building, flrs: Floor[]) {
  const dash = '—';
  const own = (o?: { ownerName: string; ownershipType: string }) => o ? [o.ownerName, o.ownershipType] : [dash, dash];
  const val = (v?: { marketValue: number; assessedValue: number; currency: string; valuationYear: number; method: string; confidence: number }) =>
    v ? [v.marketValue, v.assessedValue, v.currency, v.valuationYear, v.method, v.confidence] : [dash, dash, dash, dash, dash, dash];
  const rows = [
    ['REPORT_TYPE', 'IDENTIFIER', 'OWNER', 'OWNERSHIP_TYPE', 'MARKET_VALUE', 'ASSESSED_VALUE', 'CURRENCY', 'VALUATION_YEAR', 'METHOD', 'CONFIDENCE'],
    ['BUILDING', bldg.id, ...own(bldg.ownership), ...val(bldg.valuation)],
    ...flrs.map((floor) => ['FLOOR', floor.code, ...own(floor.ownership), ...val(floor.valuation)]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sih26011-valuation-ownership-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function printPdfReport(bldg: Building, flrs: Floor[]) {
  const dash = '—';
  const money = (v?: { marketValue: number; assessedValue: number; currency: string }) =>
    v ? [formatReportCurrency(v.marketValue, v.currency), formatReportCurrency(v.assessedValue, v.currency)] : [dash, dash];
  const [bMarket, bAssessed] = money(bldg.valuation);
  const rows = [
    `<h1>SIH26011 Valuation & Ownership Report</h1><p>Generated ${new Date().toLocaleDateString('en-IN')}</p>`,
    `<h2>Building · ${bldg.name}</h2><p><b>Owner:</b> ${bldg.ownership?.ownerName ?? dash}<br><b>Ownership:</b> ${bldg.ownership?.ownershipType ?? dash}<br><b>Market value:</b> ${bMarket}<br><b>Assessed value:</b> ${bAssessed}</p>`,
    '<h2>Floor valuation schedule</h2><table><thead><tr><th>Floor</th><th>Owner</th><th>Ownership</th><th>Market value</th><th>Assessed value</th><th>Year</th></tr></thead><tbody>',
    ...flrs.map((floor) => {
      const [fMarket, fAssessed] = money(floor.valuation);
      return `<tr><td>${floor.code} · ${floor.label}</td><td>${floor.ownership?.ownerName ?? dash}</td><td>${floor.ownership?.ownershipType ?? dash}</td><td>${fMarket}</td><td>${fAssessed}</td><td>${floor.valuation?.valuationYear ?? dash}</td></tr>`;
    }),
    '</tbody></table>',
  ];
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return;
  printWindow.document.write(`<html><head><title>SIH26011 Valuation Report</title><style>body{font-family:Arial,sans-serif;color:#17202a;padding:32px}h1{color:#087f73}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e2e8f0}</style></head><body>${rows.join('')}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function daylightFactor(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  const t = (h - 6) / 12;
  if (t <= 0 || t >= 1) return 0;
  const s = Math.sin(t * Math.PI);
  return s * s * (3 - 2 * s);
}

function mixHex(a: string, b: string, t: number) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  ca.lerp(cb, clamp01(t));
  return '#' + ca.getHexString();
}

function lerpNum(a: number, b: number, t: number) {
  return a + (b - a) * clamp01(t);
}

function formatHour(h: number) {
  const norm = ((h % 24) + 24) % 24;
  const hh = Math.floor(norm);
  const mm = Math.floor((norm - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

export default function Explorer3D() {
  const [selected, setSelected] = useState<Unit | null>(null);
  const [selectedScope, setSelectedScope] = useState<'building' | 'floor' | null>(null);
  const [exploded, setExploded] = useState(false);
  const [zMax, setZMax] = useState(36);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [hourOfDay, setHourOfDay] = useState(12);
  const [liveSync, setLiveSync] = useState(false);
  const [weather, setWeather] = useState<'clear' | 'clouds' | 'monsoon'>('clear');
  const [viewPreset, setViewPreset] = useState<'orbit' | 'bird' | 'plan' | 'cutaway' | 'street'>('orbit');
  const [showGrid, setShowGrid] = useState(true);
  const [showParcel, setShowParcel] = useState(true);
  const [showFloors, setShowFloors] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [envOpen, setEnvOpen] = useState(true);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('low');
  const [inspOpen, setInspOpen] = useState(true);
  const [interiorTour, setInteriorTour] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');
  const [minimumMarketValue, setMinimumMarketValue] = useState(0);
  const [liveData, setLiveData] = useState<LiveHierarchy | null>(null);
  const [source, setSource] = useState<'loading' | 'live' | 'demo'>('loading');
  const [summaries, setSummaries] = useState<BuildingSummary[]>([]);
  const [showCity, setShowCity] = useState(true);
  const [cityMeta, setCityMeta] = useState<{ origin: { lon: number; lat: number }; radiusM: number } | null>(null);
  const data = liveData ?? { parcel: demoParcel, building: demoBuilding, floors: demoFloors, units: demoUnits, spatialIDs: demoSpatialIDs };
  const { parcel, building, floors, units, spatialIDs } = data;
  const origin = useMemo(() => ringOrigin(building.footprint), [building]);
  const spanM = useMemo(() => footprintSpanM(building.footprint, origin[0], origin[1]), [building, origin]);
  const footprintShape = useMemo(() => {
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
  const fh = spanM / DEMO_SPAN_M;
  const fv = building.height_m > 0 ? building.height_m / DEMO_HEIGHT_M : 1;
  const cam = useMemo(() => ({
    home: { pos: [70 * fh, 60 * fv, 70 * fh] as [number, number, number], tgt: [0, 3 * fv, 0] as [number, number, number] },
    bird: { pos: [85 * fh, 95 * fv, 85 * fh] as [number, number, number], tgt: [0, 0, 0] as [number, number, number] },
    plan: { pos: [0.5 * fh, 150 * fh, 0.5 * fh] as [number, number, number], tgt: [0, 0, 0] as [number, number, number] },
    cutaway: { pos: [58 * fh, 16 * fv, 58 * fh] as [number, number, number], tgt: [0, -1, 0] as [number, number, number] },
    street: { pos: [20 * fh, 1.7, 30 * fh] as [number, number, number], tgt: [0, 5 * fv, 0] as [number, number, number] },
    interior: { pos: [14 * fh, 8 * fv, 14 * fh] as [number, number, number], tgt: [0, 3 * fv, 0] as [number, number, number] },
  }), [fh, fv]);
  const isNight = hourOfDay < 6 || hourOfDay >= 18;

  const resetForBuilding = (bldg: Building) => {
    setSelected(null);
    setSelectedFloorId(null);
    setSelectedScope(null);
    setReportSearch('');
    setOwnershipFilter('ALL');
    setMinimumMarketValue(0);
    setZMax(36 * (bldg.height_m > 0 ? bldg.height_m / DEMO_HEIGHT_M : 1));
  };

  const switchBuilding = (id: string) => {
    if (id === building.id || source !== 'live') return;
    setSource('loading');
    loadLiveHierarchy(id)
      .then((d) => {
        setLiveData(d);
        setSummaries(d.summaries);
        setSource('live');
        resetForBuilding(d.building);
      })
      .catch(() => {
        setSource('live');
      });
  };

  useEffect(() => {
    let cancelled = false;
    loadLiveHierarchy()
      .then((d) => {
        if (cancelled) return;
        setLiveData(d);
        setSummaries(d.summaries);
        setSource('live');
        resetForBuilding(d.building);
      })
      .catch(() => {
        if (!cancelled) setSource('demo');
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      .catch(() => {
        /* no city context available; scene behaves as before */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cityOffset = useMemo(() => {
    if (!cityMeta) return null;
    return footprintToLocal(
      [[cityMeta.origin.lon, cityMeta.origin.lat]],
      origin[0],
      origin[1],
    )[0];
  }, [cityMeta, origin]);
  const cityAvailable = cityMeta !== null;
  const cityVisible = showCity
    && cityAvailable
    && cityOffset !== null
    && Math.hypot(cityOffset[0], cityOffset[1]) <= (cityMeta?.radiusM ?? 0);

  useEffect(() => {
    if (!liveSync) return;
    const syncClock = () => {
      const now = new Date();
      setHourOfDay(now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600);
    };
    syncClock();
    const id = setInterval(syncClock, 30000);
    return () => clearInterval(id);
  }, [liveSync]);

  const sky = useMemo(() => {
    const dl = daylightFactor(hourOfDay);
    let bg = mixHex('#02040a', '#07090f', dl);
    let fogNear = lerpNum(90, 150, dl);
    let fogFar = lerpNum(260, 400, dl);
    if (weather === 'clouds') {
      fogFar *= 0.7;
      fogNear *= 0.85;
    }
    if (weather === 'monsoon') {
      fogFar *= 0.5;
      fogNear *= 0.7;
      bg = mixHex(bg, '#0a0f1c', 0.5);
    }
    return {
      bg,
      fogNear,
      fogFar,
      ambient: lerpNum(0.16, 0.4, dl) * (weather === 'monsoon' ? 0.8 : 1),
      sun: lerpNum(0.18, 1.2, dl) * (weather === 'clouds' ? 0.75 : weather === 'monsoon' ? 0.5 : 1),
      sunColor: mixHex('#6d86c9', '#ffffff', dl),
      hemiSky: mixHex('#101a42', '#1a2340', dl),
      hemiGround: mixHex('#02040a', '#07090f', dl),
    };
  }, [hourOfDay, weather]);
  const selectedFloor = selectedFloorId ? floors.find((fl) => fl.id === selectedFloorId) : null;
  const ownershipOptions = useMemo(
    () => source === 'live'
      ? ['ALL']
      : ['ALL', ...Array.from(new Set(floors.flatMap((floor) => floor.ownership ? [floor.ownership.ownershipType] : [])))],
    [floors, source],
  );
  const matchingFloorIds = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return new Set(floors.filter((floor) => {
      const matchesSearch = source === 'live'
        ? !query || `${floor.code} ${floor.label}`.toLowerCase().includes(query)
        : !query || `${floor.code} ${floor.label} ${floor.ownership?.ownerName ?? ''}`.toLowerCase().includes(query);
      if (source === 'live') return matchesSearch;
      const matchesOwner = ownershipFilter === 'ALL' || floor.ownership?.ownershipType === ownershipFilter;
      return matchesSearch && matchesOwner && (floor.valuation?.marketValue ?? 0) >= minimumMarketValue;
    }).map((floor) => floor.id));
  }, [floors, minimumMarketValue, ownershipFilter, reportSearch, source]);
  const reportFilterActive = Boolean(reportSearch.trim() || ownershipFilter !== 'ALL' || minimumMarketValue > 0);
  const inspectorVisible = selectedScope === 'building' || selectedFloorId !== null || selected !== null;
  const inspectorFloor = selectedFloorId
    ? floors.find((fl) => fl.id === selectedFloorId) ?? null
    : selected
      ? floors.find((f) => f.id === selected.floor_id) ?? null
      : null;
  const inspectorUnits = inspectorFloor ? units.filter((u) => u.floor_id === inspectorFloor.id) : [];
  const footprintArea = useMemo(() => {
    const pts = footprintToLocal(building.footprint, origin[0], origin[1]);
    let a = 0;
    for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
    return Math.abs(a / 2);
  }, [building, origin]);

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return units;
    return units.filter((u) =>
      u.label.toLowerCase().includes(query) ||
      u.id.toLowerCase().includes(query) ||
      spatialIDs.find((s) => s.unit_id === u.id)?.full.toLowerCase().includes(query)
    );
  }, [search]);

  useEffect(() => {
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
    const overlapDetails: Array<{ ids: string[]; volume?: number }> = [];
    
    result.issues.forEach(issue => {
      if (issue.code === 'OVERLAP_DETECTED' && issue.entity_id) {
        const ids = issue.entity_id.split(',').map(id => id.trim());
        ids.forEach(id => conflictIds.add(id));
        overlapDetails.push({ ids, volume: issue.overlap_volume });
      }
    });
    
    setConflicts(conflictIds);
    (window as any).__overlapDetails = overlapDetails;
  }, [floors, units, origin]);

  return (
    <div className="h-full flex">
      <div className="flex-1 relative bg-void">
        <Canvas
          camera={{ position: [70, 60, 70], fov: 50 }}
          frameloop={weather === 'monsoon' ? 'always' : 'demand'}
          dpr={quality === 'low' ? 1 : quality === 'medium' ? [1, 1.5] : [1, 2]}
          shadows={quality !== 'low'}
          gl={{ antialias: true, alpha: false, powerPreference: quality === 'low' ? 'low-power' : 'default' }}
          style={{ background: sky.bg }}
        >
          {quality !== 'high' && <AdaptiveDpr pixelated />}
          <color attach="background" args={[sky.bg]} />
          <fog attach="fog" args={[sky.bg, sky.fogNear * (cityVisible ? 3 : 1), sky.fogFar * (cityVisible ? 3 : 1)]} />
          <ambientLight intensity={sky.ambient} />
          <directionalLight position={[50, 80, 30]} intensity={sky.sun} color={sky.sunColor} castShadow={quality !== 'low'} shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]} />
          <directionalLight position={[-30, 40, -20]} intensity={sky.ambient} color={sky.sunColor} />
          <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.ambient]} />
          <Ground seeThrough={viewPreset === 'cutaway'} size={200 * fh} />
          {showGrid && !cityVisible && <GridFloor size={200 * fh} />}
          {showParcel && (parcel.footprint || source === 'demo') && <ParcelOutline footprint={parcel.footprint} origin={origin} />}
          {cityVisible && cityOffset && (
            <CityErrorBoundary>
              <Suspense fallback={null}>
                <CityContext
                  url="/coimbatore/city.glb"
                  position={[cityOffset[0], 0, -cityOffset[1]]}
                  cutaway={viewPreset === 'cutaway'}
                  quality={quality}
                />
              </Suspense>
            </CityErrorBoundary>
          )}
          <MonsoonRain active={weather === 'monsoon'} count={quality === 'high' ? 350 : quality === 'medium' ? 200 : 120} />
          <BuildingAnchor shape={footprintShape} height={building.height_m} onClick={() => { setSelected(null); setSelectedFloorId(null); setSelectedScope('building'); }} />
          {showFloors && floors.map((fl, fi) => (
            <FloorSlab key={fl.id} floor={fl} index={fi} shape={footprintShape} visible={(selectedFloorId === null || selectedFloorId === fl.id)} exploded={exploded} zMax={zMax} highlighted={!reportFilterActive || matchingFloorIds.has(fl.id)} onClick={() => { setSelected(null); setSelectedFloorId(fl.id); setSelectedScope('floor'); }} />
          ))}
          {showUnits && units.map((u) => {
            const fl = floors.find((f) => f.id === u.floor_id)!;
            return (
              <UnitMesh
                key={u.id}
                unit={u}
                floor={fl}
                floorIndex={floors.findIndex((f) => f.id === fl.id)}
                origin={origin}
                visible={(selectedFloorId === null || selectedFloorId === u.floor_id) && fl.z_max <= zMax}
                exploded={exploded}
                selected={selected?.id === u.id}
                conflict={conflicts.has(u.id)}
                onClick={() => { setSelected(u); setSelectedScope(null); }}
              />
            );
          })}
          <ViewRig preset={viewPreset} interiorTour={interiorTour} buildingId={building.id} cam={cam} farView={cityVisible} />
        </Canvas>

        <div className="absolute top-3 left-3 glass rounded-lg p-3 w-56">
          <h4 className="text-[10px] font-semibold text-white uppercase tracking-wider mb-2">View Controls</h4>
          {source === 'live' && (
            <div className="mb-2">
              <div className="text-[10px] text-slate-500 mb-1">BUILDING</div>
              <select
                value={building.id}
                onChange={(e) => switchBuilding(e.target.value)}
                className="w-full bg-deep text-[10px] text-slate-200 rounded-md px-2 py-1.5 border border-line outline-none focus:border-emerald-500/30"
              >
                {summaries.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {s.floorCount}f · {s.unitCount}u</option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mb-2">
            <input type="checkbox" checked={exploded} onChange={(e) => setExploded(e.target.checked)} />
            Explode Floors
          </label>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Z-Range: −3.5m — {zMax}m</label>
            <input type="range" min={-3.5} max={36} step={0.5} value={zMax} onChange={(e) => setZMax(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-[10px] text-slate-500 mb-1.5">LIGHTING</div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => { setLiveSync(false); setHourOfDay(12); }}
                className={`text-[10px] py-1 rounded uppercase tracking-wider ${!isNight ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-white/5 text-slate-400 border border-transparent hover:text-white'}`}
              >
                ☀ DAY
              </button>
              <button
                type="button"
                onClick={() => { setLiveSync(false); setHourOfDay(0); }}
                className={`text-[10px] py-1 rounded uppercase tracking-wider ${isNight ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-white/5 text-slate-400 border border-transparent hover:text-white'}`}
              >
                ☾ NIGHT
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mt-3">
            <input type="checkbox" checked={interiorTour} onChange={(e) => { setInteriorTour(e.target.checked); if (e.target.checked) setViewPreset('orbit'); }} />
            Interior Tour · zoom in
          </label>
          <div className="text-[9px] text-slate-500 mt-1">{interiorTour ? 'Close camera enabled — scroll to enter the floor layout.' : 'Enable to unlock close interior navigation.'}</div>
        </div>

        <div className="absolute top-3 left-[236px] w-60 glass rounded-lg">
          <button
            type="button"
            onClick={() => setEnvOpen((v) => !v)}
            className="w-full flex items-center justify-between p-3 text-left"
          >
            <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Environment & View</span>
            <span className="text-slate-400 text-xs">{envOpen ? '▾' : '▸'}</span>
          </button>
          {envOpen && (
            <div className="px-3 pb-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-500">TIME OF DAY</span>
                  <span className="text-[10px] mono text-emerald-300">{formatHour(hourOfDay)} · {isNight ? 'Night' : 'Day'}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={0.25}
                  value={hourOfDay}
                  disabled={liveSync}
                  onChange={(e) => setHourOfDay(Number(e.target.value))}
                  className="w-full"
                  aria-label="Time of day"
                />
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mt-1">
                  <input type="checkbox" checked={liveSync} onChange={(e) => setLiveSync(e.target.checked)} />
                  Live sync
                </label>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 mb-1">WEATHER</div>
                <div className="grid grid-cols-3 gap-1">
                  {(['clear', 'clouds', 'monsoon'] as const).map((w) => (
                    <button
                      type="button"
                      key={w}
                      onClick={() => setWeather(w)}
                      className={`text-[10px] py-1 rounded uppercase tracking-wider ${weather === w ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-white/5 text-slate-400 border border-transparent hover:text-white'}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 mb-1">CAMERA VIEWS</div>
                <div className="grid grid-cols-1 gap-1">
                  {([
                    ['orbit', 'Free Orbit'],
                    ['bird', "Bird's Eye"],
                    ['plan', 'Cadastral Plan'],
                    ['cutaway', 'Underground Cutaway'],
                    ['street', 'Street Walk · 1.7m'],
                  ] as const).map(([v, label]) => (
                    <div key={v}>
                      <button
                        type="button"
                        onClick={() => { setViewPreset(v); if (v === 'street' || v !== 'orbit') setInteriorTour(false); }}
                        className={`w-full text-left text-[10px] py-1 px-2 rounded uppercase tracking-wider ${viewPreset === v ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-white/5 text-slate-400 border border-transparent hover:text-white'}`}
                      >
                        {label}
                      </button>
                      {v === 'cutaway' && (
                        <div className="text-[9px] text-slate-500 mt-0.5 px-1">No utility data loaded — basement levels only</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 mb-1">LAYERS</div>
                <div className="space-y-1">
                  {([
                    [showGrid, setShowGrid, 'Reference grid'],
                    [showParcel, setShowParcel, 'Parcel boundary'],
                    [showFloors, setShowFloors, 'Floor slabs'],
                    [showUnits, setShowUnits, 'Property units'],
                  ] as const).map(([val, setVal, label]) => (
                    <label key={label} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={val} onChange={(e) => setVal(e.target.checked)} />
                      {label}
                    </label>
                  ))}
                  {cityAvailable && (
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={showCity} onChange={(e) => setShowCity(e.target.checked)} />
                      City context (OSM)
                    </label>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 mb-1">GRAPHICS QUALITY</div>
                <div className="grid grid-cols-3 gap-1">
                  {(['low', 'medium', 'high'] as const).map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`text-[10px] py-1 rounded uppercase tracking-wider ${quality === q ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-white/5 text-slate-400 border border-transparent hover:text-white'}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3 glass rounded-lg p-3 w-56">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-semibold text-white uppercase tracking-wider">Floor Isolation</h4>
            <span className="text-[9px] text-emerald-300 mono">
              {selectedFloorId ? floors.find((fl) => fl.id === selectedFloorId)?.code : 'ALL'}
            </span>
          </div>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => { setSelectedFloorId(null); setSelected(null); setSelectedScope(null); }}
              className={`w-full flex items-center gap-2 text-left text-[11px] py-1 px-2 rounded transition-colors ${selectedFloorId === null ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center">
                {selectedFloorId === null && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </span>
              <span className="flex-1">ALL FLOORS</span>
              <span className="text-[9px] mono text-slate-500">{floors.length}</span>
            </button>
            {floors.map((fl) => (
              <button
                type="button"
                key={fl.id}
                onClick={() => { setSelectedFloorId(fl.id); setSelected(null); setSelectedScope('floor'); }}
                className={`w-full flex items-center gap-2 text-left text-[11px] py-1 px-2 rounded transition-colors ${selectedFloorId === fl.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center">
                  {selectedFloorId === fl.id && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                </span>
                <span className="flex-1 truncate">{fl.label}</span>
                <span className="text-[9px] mono text-slate-600">{fl.code}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="absolute top-[270px] right-3 glass rounded-lg p-3 w-56">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-semibold text-white uppercase tracking-wider">Valuation Filters</h4>
            {reportFilterActive && <span className="text-[9px] text-amber-300 mono">{matchingFloorIds.size}/{floors.length}</span>}
          </div>
          <input value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} placeholder="Search floor or owner…" className="w-full bg-deep text-[10px] text-slate-200 rounded-md px-2 py-1.5 border border-line outline-none focus:border-emerald-500/30 mb-2" />
          <select value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)} className="w-full bg-deep text-[10px] text-slate-300 rounded-md px-2 py-1.5 border border-line outline-none mb-2">
            {ownershipOptions.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All ownership types' : option}</option>)}
          </select>
          <label className="text-[9px] text-slate-500 block mb-1">{source === 'live' ? 'Minimum market value · — (no backend source)' : `Minimum market value · ₹${minimumMarketValue.toLocaleString('en-IN')}`}</label>
          <input type="range" min={0} max={60000000} step={1000000} value={minimumMarketValue} disabled={source === 'live'} onChange={(e) => setMinimumMarketValue(Number(e.target.value))} className="w-full" />
          <div className="grid grid-cols-2 gap-1 mt-2">
            <button type="button" onClick={() => downloadCsv(building, floors)} className="text-[9px] py-1.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 hover:bg-emerald-500/25">CSV REPORT</button>
            <button type="button" onClick={() => printPdfReport(building, floors)} className="text-[9px] py-1.5 rounded bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10">PDF / PRINT</button>
          </div>
          {reportFilterActive && matchingFloorIds.size === 0 && <div className="text-[9px] text-danger mt-2">No floors match this filter.</div>}
        </div>

        {inspectorVisible && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass rounded-lg w-[400px] max-w-[44%] max-h-[48%] flex flex-col">
            <button
              type="button"
              onClick={() => setInspOpen((v) => !v)}
              className="w-full flex items-center justify-between p-3 text-left shrink-0"
            >
              <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Building Inspector</span>
              <span className="text-slate-400 text-xs">{inspOpen ? '▾' : '▸'}</span>
            </button>
            {inspOpen && (
              <div className="px-3 pb-3 space-y-3 overflow-y-auto">
                {source === 'demo' && <div className="text-[9px] text-slate-500">Demo data — not live backend</div>}
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Name</span>
                    <span className="text-slate-200 truncate">{building.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Parcel ID</span>
                    <span className="text-slate-200 mono truncate">{parcel.ulpin}<CopyBtn value={parcel.ulpin} /></span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">3D identifier</span>
                    <span className="text-slate-200">—</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Storeys</span>
                    <span className="text-slate-200">{building.floors_count}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Total height</span>
                    <span className="text-slate-200">{building.height_m}m</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Footprint area</span>
                    <span className="text-slate-200">{footprintArea.toFixed(0)} m²</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 mb-1">FLOORS</div>
                  <div className="flex flex-wrap gap-1">
                    {floors.map((fl) => (
                      <button
                        type="button"
                        key={fl.id}
                        title={fl.label}
                        onClick={() => {
                          if (selectedFloorId === fl.id) {
                            setSelectedFloorId(null);
                            setSelected(null);
                            setSelectedScope(null);
                          } else {
                            setSelectedFloorId(fl.id);
                            setSelected(null);
                            setSelectedScope('floor');
                          }
                        }}
                        className={`text-[10px] mono py-1 px-2 rounded border ${selectedFloorId === fl.id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' : 'bg-white/5 text-slate-400 border-transparent hover:text-white'}`}
                      >
                        {fl.code}
                      </button>
                    ))}
                  </div>
                </div>
                {inspectorFloor ? (
                  <div>
                    <div className="text-[10px] text-slate-500 mb-1">UNITS · {inspectorFloor.code}</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {inspectorUnits.map((u) => {
                        const sid = spatialIDs.find((s) => s.unit_id === u.id)?.full ?? '—';
                        const isSel = selected?.id === u.id;
                        return (
                          <div
                            key={u.id}
                            onClick={() => { setSelected(u); setSelectedScope(null); setSelectedFloorId(u.floor_id); }}
                            className={`px-2 py-1.5 rounded border cursor-pointer ${isSel ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-white/[0.02] border-transparent hover:bg-white/5'}`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className={isSel ? 'text-emerald-300' : 'text-slate-200'}>{u.label}</span>
                              <span className="text-slate-500 capitalize">{u.type}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[9px] mono text-slate-500">
                              <span className="truncate">{sid}</span>
                              {sid !== '—' && <CopyBtn value={sid} />}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              {inspectorFloor.z_min.toFixed(1)}m – {inspectorFloor.z_max.toFixed(1)}m · {u.area_sqm.toFixed(1)} m² · {volumeText(u.volume_cum)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500">Select a floor to list its units.</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-3 left-3 glass rounded-lg px-3 py-2 flex items-center gap-4">
          <div className="text-center"><div className="text-sm font-bold text-white">{units.length}</div><div className="text-[9px] text-slate-500">Units</div></div>
          <div className="w-px h-6 bg-white/10"></div>
          <div className="text-center"><div className="text-sm font-bold text-white">{floors.length}</div><div className="text-[9px] text-slate-500">Floors</div></div>
          <div className="w-px h-6 bg-white/10"></div>
          <div className="text-center"><div className="text-sm font-bold text-white">{building.height_m}m</div><div className="text-[9px] text-slate-500">Height</div></div>
          {conflicts.size > 0 && (
            <>
              <div className="w-px h-6 bg-white/10"></div>
              <div className="text-center"><div className="text-sm font-bold text-danger">{conflicts.size}</div><div className="text-[9px] text-slate-500">Conflicts</div></div>
            </>
          )}
        </div>

        {cityVisible && (
          <div className="absolute bottom-14 right-3 glass rounded px-2 py-1 max-w-56">
            <div className="text-[9px] text-slate-500">OSM context (not cadastral) - © OpenStreetMap contributors (ODbL) - heights assumed</div>
          </div>
        )}

        <div className="absolute bottom-3 right-3 glass rounded-lg px-3 py-2">
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500"></div><span className="text-slate-400">Apartment</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-slate-500"></div><span className="text-slate-400">Parking</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-orange-500"></div><span className="text-slate-400">Commercial</span></div>
            {conflicts.size > 0 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-danger"></div><span className="text-slate-400">Conflict</span></div>}
          </div>
        </div>

        <div className="absolute top-3 left-1/2 -translate-x-1/2 glass rounded-full px-3 py-1">
          {source === 'live' ? (
            <span className="text-[10px] text-emerald-300">● Live backend</span>
          ) : source === 'loading' ? (
            <span className="text-[10px] text-slate-400">Loading…</span>
          ) : (
            <span className="text-[10px] text-amber-300">● Demo data</span>
          )}
        </div>

        {conflicts.size > 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 glass rounded-lg px-4 py-3 border border-danger/30 max-w-lg">
            <div className="flex items-start gap-2">
              <i className="fas fa-triangle-exclamation text-danger text-xs mt-0.5"></i>
              <div className="flex-1">
                <div className="text-xs text-danger font-medium mb-1">Volumetric Overlap Detected</div>
                <div className="text-[11px] text-text-secondary">
                  The system detects duplicate or overlapping volumetric spatial claims using computational 3D topology validation.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-80 flex-shrink-0 bg-abyss border-l border-line flex flex-col">
        <div className="p-4 border-b border-line">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <i className="fas fa-circle-info text-emerald-400 text-xs"></i>
            Inspector
          </h3>
        </div>
        <div className="p-4 border-b border-line">
          {selected ? (
            <div className="space-y-3 animate-fade-in">
              <div className="bg-deep rounded-lg p-3">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Spatial Identifier</div>
                <div className="text-[11px] mono text-emerald-300 break-all">{spatialIDs.find((s) => s.unit_id === selected.id)?.full}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InfoCell label="Label" value={selected.label} />
                <InfoCell label="Type" value={selected.type} />
                <InfoCell label="Parcel" value={parcel.ulpin} />
                <InfoCell label="Building" value={building.name.split('—')[0].trim()} />
                <InfoCell label="Floor" value={floors.find((f) => f.id === selected.floor_id)?.code || ''} />
                <InfoCell label="Unit Code" value={selected.code} />
                <InfoCell label="Height" value={`${(floors.find((f) => f.id === selected.floor_id)?.z_max || 0) - (floors.find((f) => f.id === selected.floor_id)?.z_min || 0)}m`} />
                <InfoCell label="Area" value={`${selected.area_sqm.toFixed(1)} m²`} />
                <InfoCell label="Volume" value={volumeText(selected.volume_cum)} />
                <InfoCell label="Geom. Version" value={`V${String(selected.version).padStart(2, '0')}`} />
              </div>
              <div className="bg-deep rounded-lg p-3">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Geometry Hash (SHA-256)</div>
                <div className="text-[9px] mono text-slate-400 break-all">{selected.hash}</div>
              </div>
              <div className="bg-deep rounded-lg p-3">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Validation Status</div>
                {conflicts.has(selected.id) ? (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-triangle-exclamation text-danger text-xs"></i>
                    <span className="text-xs text-danger">Conflict detected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-circle-check text-accent text-xs"></i>
                    <span className="text-xs text-accent">Valid — no overlaps</span>
                  </div>
                )}
              </div>
            </div>
          ) : selectedScope === 'floor' && selectedFloor ? (
            <InspectorEntityPanel
              kind="FLOOR"
              title={`${selectedFloor.code} · ${selectedFloor.label}`}
              subtitle={`${selectedFloor.area_sqm.toFixed(0)} m² floor plate · ${selectedFloor.z_min.toFixed(1)}m to ${selectedFloor.z_max.toFixed(1)}m`}
              ownership={selectedFloor.ownership}
              valuation={selectedFloor.valuation}
            />
          ) : selectedScope === 'building' ? (
            <InspectorEntityPanel
              kind="BUILDING"
              title={building.name}
              subtitle={`${building.floors_count} floors · ${building.height_m}m · ${building.height_source} height source`}
              ownership={building.ownership}
              valuation={building.valuation}
            />
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-mouse-pointer text-slate-700 text-2xl mb-2"></i>
              <p className="text-xs text-slate-600">Click a building, floor, or unit in the 3D view</p>
            </div>
          )}
        </div>
        <div className="p-3 border-b border-line">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs"></i>
            <input
              type="text"
              placeholder="Search units, IDs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-deep text-xs text-slate-200 rounded-md pl-9 pr-3 py-2 border border-line focus:border-emerald-500/30 outline-none placeholder-slate-600"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredUnits.map((u) => {
            const sid = spatialIDs.find((s) => s.unit_id === u.id);
            const isSelected = selected?.id === u.id;
            return (
              <button
                key={u.id}
                onClick={() => { setSelected(u); setSelectedScope(null); setSelectedFloorId(u.floor_id); }}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-all ${
                  isSelected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`truncate ${isSelected ? 'text-emerald-300' : 'text-slate-300'}`}>{u.label}</span>
                  <span className="text-[9px] text-slate-600 ml-2 flex-shrink-0">{u.area_sqm}m²</span>
                </div>
                {sid && <div className="text-[9px] mono text-slate-600 truncate mt-0.5">{sid.full}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 3D Components ─────────────────────────────────────────────

type CamPose = { pos: [number, number, number]; tgt: [number, number, number] };
type CamPoses = { home: CamPose; bird: CamPose; plan: CamPose; cutaway: CamPose; street: CamPose; interior: CamPose };

function ViewRig({ preset, interiorTour, buildingId, cam, farView }: { preset: 'orbit' | 'bird' | 'plan' | 'cutaway' | 'street'; interiorTour: boolean; buildingId: string; cam: CamPoses; farView: boolean }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const invalidate = useThree((s) => s.invalidate);
  const goal = useRef<{ pos: [number, number, number]; tgt: [number, number, number] } | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (interiorTour) goal.current = cam.interior;
    else if (preset === 'bird') goal.current = cam.bird;
    else if (preset === 'plan') goal.current = cam.plan;
    else if (preset === 'cutaway') goal.current = cam.cutaway;
    else if (preset === 'street') goal.current = cam.street;
    else goal.current = first ? null : cam.home;
    invalidate();
  }, [preset, interiorTour, buildingId, cam, invalidate]);

  useFrame((_, dt) => {
    const g = goal.current;
    if (!g) return;
    invalidate();
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3);
    camera.position.lerp(new THREE.Vector3(g.pos[0], g.pos[1], g.pos[2]), k);
    if (controls) {
      controls.target.lerp(new THREE.Vector3(g.tgt[0], g.tgt[1], g.tgt[2]), k);
      controls.update();
    }
    if (camera.position.distanceTo(new THREE.Vector3(g.pos[0], g.pos[1], g.pos[2])) < 0.15) goal.current = null;
  });

  return (
    <OrbitControls
      makeDefault
      enableDamping
      regress
      dampingFactor={0.05}
      enableZoom
      minDistance={preset === 'street' || interiorTour ? 1 : 15}
      maxDistance={farView ? 900 : 250}
      maxPolarAngle={Math.PI / 2 - 0.05}
      target={[0, 3, 0]}
    />
  );
}

function MonsoonRain({ active, count = 350 }: { active: boolean; count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const drops = useMemo(() => {
    const arr: Array<{ x: number; y: number; z: number; speed: number }> = [];
    for (let i = 0; i < count; i++) {
      arr.push({ x: (Math.random() - 0.5) * 130, y: Math.random() * 60, z: (Math.random() - 0.5) * 130, speed: 22 + Math.random() * 14 });
    }
    return arr;
  }, [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y -= d.speed * step;
      if (d.y < 0) {
        d.y = 55 + Math.random() * 5;
        d.x = (Math.random() - 0.5) * 130;
        d.z = (Math.random() - 0.5) * 130;
      }
      dummy.position.set(d.x, d.y, d.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  if (!active) return null;
  return (
    <instancedMesh key={count} ref={ref} args={[undefined, undefined, count] as unknown as [undefined, undefined, number]} frustumCulled={false}>
      <boxGeometry args={[0.07, 1.3, 0.07]} />
      <meshBasicMaterial color="#7dd3fc" transparent opacity={0.45} />
    </instancedMesh>
  );
}

class CityErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(): void {}
  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

function CityContext({ url, position, cutaway, quality }: {
  url: string;
  position: [number, number, number];
  cutaway: boolean;
  quality: 'low' | 'medium' | 'high';
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = (mesh.name || '').toLowerCase();
      if (name.startsWith('buildings')) {
        mesh.material = quality === 'low'
          ? new THREE.MeshLambertMaterial({ vertexColors: true })
          : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
        mesh.castShadow = quality !== 'low';
      } else {
        mesh.material = new THREE.MeshLambertMaterial({
          vertexColors: true,
          transparent: cutaway,
          opacity: cutaway ? 0.35 : 1,
        });
      }
      mesh.receiveShadow = true;
    });
    return c;
  }, [scene, quality, cutaway]);
  useEffect(() => () => {
    // Dispose only the materials created for the clone; geometries are
    // shared with the useGLTF cache and must stay alive.
    cloned.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    });
  }, [cloned]);
  return <primitive object={cloned} position={position} />;
}

function Ground({ seeThrough, size = 200 }: { seeThrough?: boolean; size?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#0f1629" transparent={!!seeThrough} opacity={seeThrough ? 0.22 : 1} depthWrite={!seeThrough} />
    </mesh>
  );
}

function GridFloor({ size = 200 }: { size?: number }) {
  return <gridHelper args={[size, 40, '#1a2340', '#1a2340' ]} position={[0, 0, 0]} />;
}

function ParcelOutline({ footprint, origin }: { footprint?: number[][]; origin: [number, number] }) {
  const points = useMemo(() => {
    if (!footprint) {
      return [
        new THREE.Vector3(-40, 0.05, -30),
        new THREE.Vector3(40, 0.05, -30),
        new THREE.Vector3(40, 0.05, 30),
        new THREE.Vector3(-40, 0.05, 30),
        new THREE.Vector3(-40, 0.05, -30),
      ];
    }
    return footprintToLocal(footprint, origin[0], origin[1]).map(
      ([x, y]) => new THREE.Vector3(x, 0.05, -y),
    );
  }, [footprint, origin]);
  const lineObj = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: '#10b981', linewidth: 2, transparent: true, opacity: 0.6 });
    return new THREE.Line(geom, mat);
  }, [points]);
  useEffect(() => () => {
    lineObj.geometry.dispose();
    (lineObj.material as THREE.Material).dispose();
  }, [lineObj]);
  return <primitive object={lineObj} />;
}

function BuildingAnchor({ shape, height, onClick }: { shape: THREE.Shape; height: number; onClick: () => void }) {
  const geom = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(height, 0.1), bevelEnabled: false, steps: 1 });
    return g;
  }, [shape, height]);
  useEffect(() => () => {
    geom.dispose();
  }, [geom]);
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <primitive object={geom} attach="geometry" />
      <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
    </mesh>
  );
}

function FloorSlab({ floor, index, shape, visible, exploded, zMax, highlighted, onClick }: {
  floor: Floor; index: number; shape: THREE.Shape; visible: boolean; exploded: boolean; zMax: number; highlighted: boolean; onClick: () => void;
}) {
  const floorColors = ['#64748b', '#22c55e', '#f59e0b', '#3b82f6', '#3b82f6', '#ec4899', '#84cc16', '#a855f7'];
  const yOffset = exploded ? index * 2 : 0;
  const height = floor.z_max - floor.z_min;
  const geom = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(height - 0.2, 0.1), bevelEnabled: false, steps: 1 });
    g.translate(0, 0, floor.z_min + 0.1);
    return g;
  }, [shape, floor, height]);
  useEffect(() => () => {
    geom.dispose();
  }, [geom]);
  if (!visible || floor.z_max > zMax) return null;
  return (
    <mesh position={[0, yOffset, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial color={highlighted ? '#fbbf24' : floorColors[index % floorColors.length]} transparent opacity={highlighted ? 0.34 : 0.06} side={THREE.DoubleSide} />
    </mesh>
  );
}

function UnitMesh({ unit, floor, floorIndex, origin, visible, exploded, selected, conflict, onClick }: {
  unit: Unit; floor: Floor; floorIndex: number; origin: [number, number]; visible: boolean; exploded: boolean; selected: boolean; conflict: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const geometry = useMemo(() => {
    const localFootprint = footprintToLocal(unit.footprint, origin[0], origin[1]);
    const solid = generatePolyhedralSolid(
      { coordinates: localFootprint as [number, number][] },
      floor.z_min,
      floor.z_max
    );
    return solidToBufferGeometry(solid);
  }, [unit, floor, origin]);

  if (!visible) return null;
  const yOffset = exploded ? floorIndex * 2 : 0;

  let color = '#6366f1';
  if (conflict) color = '#ef4444';
  else if (selected) color = '#fbbf24';
  else if (hovered) color = '#ffffff';
  else {
    const colors: Record<string, string> = { apartment: '#10b981', parking: '#64748b', commercial: '#f97316', lobby: '#3b82f6', common: '#8b5cf6' };
    color = colors[unit.type] || '#6366f1';
  }

  return (
    <mesh
      geometry={geometry}
      position={[0, yOffset, 0]}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      <meshStandardMaterial
        color={color}
        transparent
        opacity={selected ? 0.95 : hovered ? 0.85 : 0.7}
        emissive={conflict ? '#ef4444' : selected ? '#fbbf24' : color}
        emissiveIntensity={conflict ? 0.4 : selected ? 0.3 : hovered ? 0.15 : 0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function solidToBufferGeometry(solid: Solid3D): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let indexOffset = 0;

  for (const face of solid.faces) {
    const faceVerts = face.vertices;
    for (let i = 1; i < faceVerts.length - 1; i++) {
      indices.push(indexOffset, indexOffset + i, indexOffset + i + 1);
    }
    for (const vi of faceVerts) {
      const v = solid.vertices[vi];
      positions.push(v.x, v.z, -v.y);
      normals.push(face.normal.x, face.normal.z, -face.normal.y);
      indexOffset++;
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setIndex(indices);
  geom.computeBoundingSphere();
  return geom;
}

// ─── Shared Components ─────────────────────────────────────────

function Panel({ title, icon, iconSpin, subtitle, children }: any) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-line flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-surface flex items-center justify-center">
          <i className={`fas ${icon} text-[10px] text-text-tertiary ${iconSpin ? 'fa-spin' : ''}`}></i>
        </div>
        <div><h3 className="text-sm font-semibold text-text-primary">{title}</h3>{subtitle && <p className="text-[10px] text-text-tertiary mt-0.5">{subtitle}</p>}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, icon }: any) {
  return (
    <div className="card card-interactive p-5 animate-fade-in">
      <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center mb-3"><i className={`fas ${icon}`}></i></div>
      <div className="text-3xl font-bold text-text-primary mb-1">{value}</div>
      <div className="text-xs text-text-tertiary">{label}</div>
    </div>
  );
}

function DataRow({ k, v, good }: any) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs text-text-tertiary">{k}</span>
      <span className={`text-sm ${good ? 'text-accent' : 'text-text-primary'}`}>{v}</span>
    </div>
  );
}

function InfoCell({ label, value }: any) {
  return (
    <div className="bg-deep rounded-lg p-2.5">
      <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs text-text-primary capitalize">{value}</div>
    </div>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      title="Copy to clipboard"
      onClick={(e) => {
        e.stopPropagation();
        try {
          void navigator.clipboard?.writeText(value);
        } catch {
          /* clipboard unavailable */
        }
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className="ml-1 text-[10px] text-slate-500 hover:text-emerald-300"
    >
      {ok ? '✓' : '⧉'}
    </button>
  );
}

function InspectorEntityPanel({ kind, title, subtitle, ownership, valuation }: {
  kind: string;
  title: string;
  subtitle: string;
  ownership?: { ownerName: string; ownershipType: string; tenure: string; share: string; lastVerified: string };
  valuation?: { marketValue: number; assessedValue: number; currency: string; valuationYear: number; method: string; confidence: number };
}) {
  const dash = '—';
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: valuation?.currency ?? 'INR', maximumFractionDigits: 0 });
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="bg-deep rounded-lg p-3">
        <div className="text-[9px] text-emerald-300 uppercase tracking-wider mb-1">{kind} RECORD</div>
        <div className="text-sm text-white font-medium">{title}</div>
        <div className="text-[10px] text-slate-500 mt-1">{subtitle}</div>
      </div>
      <div className="bg-deep rounded-lg p-3">
        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Ownership</div>
        <div className="text-xs text-white font-medium mb-2">{ownership?.ownerName ?? dash}</div>
        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="Title" value={ownership?.ownershipType ?? dash} />
          <InfoCell label="Tenure" value={ownership?.tenure ?? dash} />
          <InfoCell label="Share" value={ownership?.share ?? dash} />
          <InfoCell label="Verified" value={ownership?.lastVerified ?? dash} />
        </div>
      </div>
      <div className="bg-deep rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider">Property Valuation</div>
          <span className="text-[9px] text-emerald-300 mono">{valuation?.valuationYear ?? dash}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <InfoCell label="Market Value" value={valuation ? currency.format(valuation.marketValue) : dash} />
          <InfoCell label="Assessed Value" value={valuation ? currency.format(valuation.assessedValue) : dash} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{valuation?.method ?? dash}</span>
          <span className="text-emerald-300">{valuation ? `${Math.round(valuation.confidence * 100)}% confidence` : dash}</span>
        </div>
      </div>
    </div>
  );
}
