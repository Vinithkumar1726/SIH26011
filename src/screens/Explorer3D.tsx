import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Unit } from '../workspace3d/types';
import { building, floors, footprintToLocal, parcel, spatialIDs, units } from '../workspace3d/data';
import { generatePolyhedralSolid, type Solid3D, validateTopology } from '../workspace3d/geo';

const CENTER_LON = 77.209;
const CENTER_LAT = 28.613;

function formatReportCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function downloadCsv() {
  const rows = [
    ['REPORT_TYPE', 'IDENTIFIER', 'OWNER', 'OWNERSHIP_TYPE', 'MARKET_VALUE', 'ASSESSED_VALUE', 'CURRENCY', 'VALUATION_YEAR', 'METHOD', 'CONFIDENCE'],
    ['BUILDING', building.id, building.ownership.ownerName, building.ownership.ownershipType, building.valuation.marketValue, building.valuation.assessedValue, building.valuation.currency, building.valuation.valuationYear, building.valuation.method, building.valuation.confidence],
    ...floors.map((floor) => ['FLOOR', floor.code, floor.ownership.ownerName, floor.ownership.ownershipType, floor.valuation.marketValue, floor.valuation.assessedValue, floor.valuation.currency, floor.valuation.valuationYear, floor.valuation.method, floor.valuation.confidence]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sih26011-valuation-ownership-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function printPdfReport() {
  const rows = [
    `<h1>SIH26011 Valuation & Ownership Report</h1><p>Generated ${new Date().toLocaleDateString('en-IN')}</p>`,
    `<h2>Building · ${building.name}</h2><p><b>Owner:</b> ${building.ownership.ownerName}<br><b>Ownership:</b> ${building.ownership.ownershipType}<br><b>Market value:</b> ${formatReportCurrency(building.valuation.marketValue, building.valuation.currency)}<br><b>Assessed value:</b> ${formatReportCurrency(building.valuation.assessedValue, building.valuation.currency)}</p>`,
    '<h2>Floor valuation schedule</h2><table><thead><tr><th>Floor</th><th>Owner</th><th>Ownership</th><th>Market value</th><th>Assessed value</th><th>Year</th></tr></thead><tbody>',
    ...floors.map((floor) => `<tr><td>${floor.code} · ${floor.label}</td><td>${floor.ownership.ownerName}</td><td>${floor.ownership.ownershipType}</td><td>${formatReportCurrency(floor.valuation.marketValue, floor.valuation.currency)}</td><td>${formatReportCurrency(floor.valuation.assessedValue, floor.valuation.currency)}</td><td>${floor.valuation.valuationYear}</td></tr>`),
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
  const [interiorTour, setInteriorTour] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');
  const [minimumMarketValue, setMinimumMarketValue] = useState(0);
  const isNight = hourOfDay < 6 || hourOfDay >= 18;

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
  const ownershipOptions = useMemo(() => ['ALL', ...Array.from(new Set(floors.map((floor) => floor.ownership.ownershipType)))], []);
  const matchingFloorIds = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return new Set(floors.filter((floor) => {
      const matchesSearch = !query || `${floor.code} ${floor.label} ${floor.ownership.ownerName}`.toLowerCase().includes(query);
      const matchesOwner = ownershipFilter === 'ALL' || floor.ownership.ownershipType === ownershipFilter;
      return matchesSearch && matchesOwner && floor.valuation.marketValue >= minimumMarketValue;
    }).map((floor) => floor.id));
  }, [minimumMarketValue, ownershipFilter, reportSearch]);
  const reportFilterActive = Boolean(reportSearch.trim() || ownershipFilter !== 'ALL' || minimumMarketValue > 0);

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
  }, []);

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
          <fog attach="fog" args={[sky.bg, sky.fogNear, sky.fogFar]} />
          <ambientLight intensity={sky.ambient} />
          <directionalLight position={[50, 80, 30]} intensity={sky.sun} color={sky.sunColor} castShadow={quality !== 'low'} shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]} />
          <directionalLight position={[-30, 40, -20]} intensity={sky.ambient} color={sky.sunColor} />
          <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.ambient]} />
          <Ground seeThrough={viewPreset === 'cutaway'} />
          {showGrid && <GridFloor />}
          {showParcel && <ParcelOutline />}
          <MonsoonRain active={weather === 'monsoon'} count={quality === 'high' ? 350 : quality === 'medium' ? 200 : 120} />
          <BuildingAnchor onClick={() => { setSelected(null); setSelectedFloorId(null); setSelectedScope('building'); }} />
          {showFloors && floors.map((fl, fi) => (
            <FloorSlab key={fl.id} floor={fl} index={fi} visible={(selectedFloorId === null || selectedFloorId === fl.id)} exploded={exploded} zMax={zMax} highlighted={!reportFilterActive || matchingFloorIds.has(fl.id)} onClick={() => { setSelected(null); setSelectedFloorId(fl.id); setSelectedScope('floor'); }} />
          ))}
          {showUnits && units.map((u) => {
            const fl = floors.find((f) => f.id === u.floor_id)!;
            return (
              <UnitMesh
                key={u.id}
                unit={u}
                floor={fl}
                visible={(selectedFloorId === null || selectedFloorId === u.floor_id) && fl.z_max <= zMax}
                exploded={exploded}
                selected={selected?.id === u.id}
                conflict={conflicts.has(u.id)}
                onClick={() => { setSelected(u); setSelectedScope(null); }}
              />
            );
          })}
          <ViewRig preset={viewPreset} interiorTour={interiorTour} />
        </Canvas>

        <div className="absolute top-3 left-3 glass rounded-lg p-3 w-56">
          <h4 className="text-[10px] font-semibold text-white uppercase tracking-wider mb-2">View Controls</h4>
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
          <label className="text-[9px] text-slate-500 block mb-1">Minimum market value · ₹{minimumMarketValue.toLocaleString('en-IN')}</label>
          <input type="range" min={0} max={60000000} step={1000000} value={minimumMarketValue} onChange={(e) => setMinimumMarketValue(Number(e.target.value))} className="w-full" />
          <div className="grid grid-cols-2 gap-1 mt-2">
            <button type="button" onClick={downloadCsv} className="text-[9px] py-1.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 hover:bg-emerald-500/25">CSV REPORT</button>
            <button type="button" onClick={printPdfReport} className="text-[9px] py-1.5 rounded bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10">PDF / PRINT</button>
          </div>
          {reportFilterActive && matchingFloorIds.size === 0 && <div className="text-[9px] text-danger mt-2">No floors match this filter.</div>}
        </div>

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

        <div className="absolute bottom-3 right-3 glass rounded-lg px-3 py-2">
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500"></div><span className="text-slate-400">Apartment</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-slate-500"></div><span className="text-slate-400">Parking</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-orange-500"></div><span className="text-slate-400">Commercial</span></div>
            {conflicts.size > 0 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-danger"></div><span className="text-slate-400">Conflict</span></div>}
          </div>
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
                <InfoCell label="Volume" value={`${selected.volume_cum.toFixed(1)} m³`} />
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

function ViewRig({ preset, interiorTour }: { preset: 'orbit' | 'bird' | 'plan' | 'cutaway' | 'street'; interiorTour: boolean }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const invalidate = useThree((s) => s.invalidate);
  const goal = useRef<{ pos: [number, number, number]; tgt: [number, number, number] } | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (interiorTour) goal.current = { pos: [14, 8, 14], tgt: [0, 3, 0] };
    else if (preset === 'bird') goal.current = { pos: [85, 95, 85], tgt: [0, 0, 0] };
    else if (preset === 'plan') goal.current = { pos: [0.5, 150, 0.5], tgt: [0, 0, 0] };
    else if (preset === 'cutaway') goal.current = { pos: [58, 16, 58], tgt: [0, -1, 0] };
    else if (preset === 'street') goal.current = { pos: [20, 1.7, 30], tgt: [0, 5, 0] };
    else goal.current = first ? null : { pos: [70, 60, 70], tgt: [0, 3, 0] };
    invalidate();
  }, [preset, interiorTour, invalidate]);

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
      maxDistance={250}
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

function Ground({ seeThrough }: { seeThrough?: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#0f1629" transparent={!!seeThrough} opacity={seeThrough ? 0.22 : 1} depthWrite={!seeThrough} />
    </mesh>
  );
}

function GridFloor() {
  return <gridHelper args={[200, 40, '#1a2340', '#1a2340' ]} position={[0, 0, 0]} />;
}

function ParcelOutline() {
  const points = useMemo(() => [
    new THREE.Vector3(-40, 0.05, -30),
    new THREE.Vector3(40, 0.05, -30),
    new THREE.Vector3(40, 0.05, 30),
    new THREE.Vector3(-40, 0.05, 30),
    new THREE.Vector3(-40, 0.05, -30),
  ], []);
  const lineObj = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: '#10b981', linewidth: 2, transparent: true, opacity: 0.6 });
    return new THREE.Line(geom, mat);
  }, [points]);
  return <primitive object={lineObj} />;
}

function BuildingAnchor({ onClick }: { onClick: () => void }) {
  return (
    <mesh position={[0, 0.02, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <boxGeometry args={[42, 0.08, 30]} />
      <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
    </mesh>
  );
}

function FloorSlab({ floor, index, visible, exploded, zMax, highlighted, onClick }: {
  floor: typeof floors[0]; index: number; visible: boolean; exploded: boolean; zMax: number; highlighted: boolean; onClick: () => void;
}) {
  if (!visible || floor.z_max > zMax) return null;
  const floorColors = ['#64748b', '#22c55e', '#f59e0b', '#3b82f6', '#3b82f6', '#ec4899', '#84cc16', '#a855f7'];
  const yOffset = exploded ? index * 2 : 0;
  const height = floor.z_max - floor.z_min;
  const y = floor.z_min + height / 2 + yOffset;
  return (
    <mesh position={[0, y, 0]} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <boxGeometry args={[42, height - 0.2, 30]} />
      <meshStandardMaterial color={highlighted ? '#fbbf24' : floorColors[index % floorColors.length]} transparent opacity={highlighted ? 0.34 : 0.06} side={THREE.DoubleSide} />
    </mesh>
  );
}

function UnitMesh({ unit, floor, visible, exploded, selected, conflict, onClick }: {
  unit: Unit; floor: typeof floors[0]; visible: boolean; exploded: boolean; selected: boolean; conflict: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const geometry = useMemo(() => {
    const localFootprint = footprintToLocal(unit.footprint, CENTER_LON, CENTER_LAT);
    const solid = generatePolyhedralSolid(
      { coordinates: localFootprint as [number, number][] },
      floor.z_min,
      floor.z_max
    );
    return solidToBufferGeometry(solid);
  }, [unit, floor]);

  if (!visible) return null;
  const floorIndex = floors.findIndex(f => f.id === floor.id);
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

function InspectorEntityPanel({ kind, title, subtitle, ownership, valuation }: {
  kind: string;
  title: string;
  subtitle: string;
  ownership: { ownerName: string; ownershipType: string; tenure: string; share: string; lastVerified: string };
  valuation: { marketValue: number; assessedValue: number; currency: string; valuationYear: number; method: string; confidence: number };
}) {
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: valuation.currency, maximumFractionDigits: 0 });
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="bg-deep rounded-lg p-3">
        <div className="text-[9px] text-emerald-300 uppercase tracking-wider mb-1">{kind} RECORD</div>
        <div className="text-sm text-white font-medium">{title}</div>
        <div className="text-[10px] text-slate-500 mt-1">{subtitle}</div>
      </div>
      <div className="bg-deep rounded-lg p-3">
        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Ownership</div>
        <div className="text-xs text-white font-medium mb-2">{ownership.ownerName}</div>
        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="Title" value={ownership.ownershipType} />
          <InfoCell label="Tenure" value={ownership.tenure} />
          <InfoCell label="Share" value={ownership.share} />
          <InfoCell label="Verified" value={ownership.lastVerified} />
        </div>
      </div>
      <div className="bg-deep rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider">Property Valuation</div>
          <span className="text-[9px] text-emerald-300 mono">{valuation.valuationYear}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <InfoCell label="Market Value" value={currency.format(valuation.marketValue)} />
          <InfoCell label="Assessed Value" value={currency.format(valuation.assessedValue)} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{valuation.method}</span>
          <span className="text-emerald-300">{Math.round(valuation.confidence * 100)}% confidence</span>
        </div>
      </div>
    </div>
  );
}
