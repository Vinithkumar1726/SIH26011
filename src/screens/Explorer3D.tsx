import { Component, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, Html, Line, OrbitControls, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import type { Building, Floor, SpatialID, Unit } from '../workspace3d/types';
import { building as demoBuilding, floors as demoFloors, footprintToLocal, lonLatToLocal, parcel as demoParcel, spatialIDs as demoSpatialIDs, units as demoUnits } from '../workspace3d/data';
import QRCode from 'qrcode';
import CollapsePanel from '../components/CollapsePanel';
import LiveMapPanel from '../components/LiveMapPanel';
import MapLibrePanel from '../components/MapLibrePanel';
import { Badge, Button, Card, StatusDot } from '../design/primitives';
import { DOMAIN, FONT, INK, MUTED, PAPER, SURFACE } from '../design/tokens';
import { api } from '../api';
import CadastralHierarchy from '../components/CadastralHierarchy';
import { loadLiveHierarchy, fetchCityBuildings, isCadastralBuilding, type BuildingSummary, type CityBuilding, type LiveHierarchy } from '../workspace3d/api';
import { startAiJob, pollAiJob } from '../workspace3d/aiAnalysisService';
import { SYNTHETIC_PIPES, segBoxDist, classifyClearance, type Box3, type Vec3 } from '../workspace3d/underground';
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

async function printPdfReport(bldg: Building, flrs: Floor[], units: Unit[], sids: SpatialID[], live?: {
  ulpin: string;
  height_m: number;
  lat: number;
  lon: number;
  elevation_msl_m?: number;
  encroachment?: boolean;
} | null) {
  const dash = '—';
  // Popup blockers cannot be relied on: deliver the passport as a file
  // download (anchor click), which browsers never block. The user opens
  // the HTML and prints to PDF.
  const money = (v?: { marketValue: number; assessedValue: number; currency: string }) =>
    v ? [formatReportCurrency(v.marketValue, v.currency), formatReportCurrency(v.assessedValue, v.currency)] : [dash, dash];
  const [bMarket, bAssessed] = money(bldg.valuation);
  const unitRows = await Promise.all(units.map(async (u) => {
    const sid = sids.find((s) => s.unit_id === u.id);
    const hash = sid?.hash ?? u.hash;
    const ver = `V${String(sid?.version ?? u.version).padStart(2, '0')}`;
    let qr = dash;
    if (hash) {
      try {
        qr = `<img src="${await QRCode.toDataURL(`SIH26011:${u.id}:${hash}:${ver}`, { width: 112, margin: 1 })}" width="56" height="56" alt="QR ${u.code}" />`;
      } catch {
        qr = dash;
      }
    }
    return `<tr><td>${u.label} (${u.code})</td><td>${sid?.full ?? dash}</td><td>${hash ? hash.slice(0, 32) + '…' : dash}</td><td>${ver}</td><td>${qr}</td></tr>`;
  }));
  // SVAMITVA verify QR: offline data-URI via the existing qrcode package
  // (no third-party API, no ULPIN leakage). Links the verify bridge.
  let liveQr = dash;
  if (live?.ulpin) {
    try {
      liveQr = `<img src="${await QRCode.toDataURL(`https://cadastral.ai/verify/${live.ulpin}`, { width: 132, margin: 1 })}" width="66" height="66" alt="SVAMITVA verify ${live.ulpin}" />`;
    } catch {
      liveQr = dash;
    }
  }
  const rows = [
    `<h1>3D Bhu-Aadhaar</h1><p>Generated ${new Date().toLocaleDateString('en-IN')}</p>`,
    `<h2>Building · ${bldg.name}</h2><p><b>Owner:</b> ${bldg.ownership?.ownerName ?? dash}<br><b>Ownership:</b> ${bldg.ownership?.ownershipType ?? dash}<br><b>Market value:</b> ${bMarket}<br><b>Assessed value:</b> ${bAssessed}</p>`,
    ...(live
      ? [`<h2>Live-captured structure</h2><p><b>Bhu-Aadhaar:</b> ${live.ulpin}<br><b>Height:</b> ${live.height_m}m<br><b>Location:</b> ${live.lat.toFixed(6)}, ${live.lon.toFixed(6)}<br><b>Elevation (MSL):</b> ${live.elevation_msl_m !== undefined ? `${live.elevation_msl_m}m (NASA SRTM)` : dash}<br><b>Encroachment Check:</b> ${live.encroachment === undefined ? dash : live.encroachment ? '<span style="color: red; font-weight: bold;">CONFLICT DETECTED</span>' : '<span style="color: green;">CLEAR</span>'}</p><p><b>SVAMITVA Verify:</b><br>${liveQr}<br><span style="font-size:10px">https://cadastral.ai/verify/${live.ulpin}</span></p>`]
      : []),
    '<h2>Floor valuation schedule</h2><table><thead><tr><th>Floor</th><th>Owner</th><th>Ownership</th><th>Market value</th><th>Assessed value</th><th>Year</th></tr></thead><tbody>',
    ...flrs.map((floor) => {
      const [fMarket, fAssessed] = money(floor.valuation);
      return `<tr><td>${floor.code} · ${floor.label}</td><td>${floor.ownership?.ownerName ?? dash}</td><td>${floor.ownership?.ownershipType ?? dash}</td><td>${fMarket}</td><td>${fAssessed}</td><td>${floor.valuation?.valuationYear ?? dash}</td></tr>`;
    }),
    '</tbody></table>',
    '<h2>Unit geometry schedule</h2><table><thead><tr><th>Unit</th><th>3D identifier</th><th>Geometry hash</th><th>Version</th><th>QR</th></tr></thead><tbody>',
    ...unitRows,
    '</tbody></table>',
    '<footer style="margin-top:24px;font-size:11px;color:#5A6B8A;border-top:1px solid #C8D0DB;padding-top:8px">Prototype 3D Property Record — not a legal document</footer>',
  ];
  const html = `<html><head><title>3D Bhu-Aadhaar Report</title><style>body{font-family:Arial,sans-serif;color:#17202a;padding:32px}h1{color:#087f73}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e2e8f0}</style></head><body>${rows.join('')}</body></html>`;
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const name = `bhu-aadhaar-${(live?.ulpin ?? bldg.name ?? 'record').replace(/[^A-Za-z0-9-]+/g, '_')}.html`;
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch {
    return false;
  }
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
  const inspectorVisible = selectedScope === 'building' || selectedFloorId !== null || selected !== null;
  const [search, setSearch] = useState('');
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [hourOfDay, setHourOfDay] = useState(12);
  const [liveSync, setLiveSync] = useState(false);
  const [weather, setWeather] = useState<'clear' | 'clouds' | 'monsoon'>('clear');
  const [viewPreset, setViewPreset] = useState<ViewPreset>('orbit');
  const [camNonce, setCamNonce] = useState(0);
  const flyTo = (v: ViewPreset) => {
    setViewPreset(v);
    setCamNonce((n) => n + 1);
  };
  const [showGrid, setShowGrid] = useState(true);
  const [showParcel, setShowParcel] = useState(true);
  const [showFloors, setShowFloors] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [openPanels, setOpenPanels] = useState({ view: true, env: false, floor: false, val: false });
  const [conflictOpen, setConflictOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'inspector' | 'hierarchy' | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [compact, setCompact] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const narrowInit = useRef(false);
  const togglePanel = (k: 'view' | 'env' | 'floor' | 'val') =>
    setOpenPanels((p) => ({ ...p, [k]: !p[k] }));
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const apply = (w: number) => {
      const isNarrow = w < 900;
      setNarrow(isNarrow);
      setCompact(w < 520);
      if (!narrowInit.current) {
        narrowInit.current = true;
        if (isNarrow) setOpenPanels({ view: false, env: false, floor: false, val: false });
      }
    };
    apply(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w === 'number') apply(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('low');
  const [inspOpen, setInspOpen] = useState(true);
  const [interiorTour, setInteriorTour] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');
  const [minimumMarketValue, setMinimumMarketValue] = useState(0);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [liveCaptureMode, setLiveCaptureMode] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [ilimsMode, setIlimsMode] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [map2DMode, setMap2DMode] = useState<'satellite' | 'vector'>('satellite');
  const [selectedLiveParcelId, setSelectedLiveParcelId] = useState<string | null>(null);
  const [liveCaptureLoading, setLiveCaptureLoading] = useState(false);
  const [liveCaptureNotice, setLiveCaptureNotice] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<LiveHierarchy | null>(null);
  const [source, setSource] = useState<'loading' | 'live' | 'demo'>('loading');
  const [summaries, setSummaries] = useState<BuildingSummary[]>([]);
  const [cityBuildings, setCityBuildings] = useState<CityBuilding[]>([]);
  const [liveParcels, setLiveParcels] = useState<Array<{
    parcel_id: string;
    height_m: number;
    footprint: { type: string; coordinates: number[][][] } | null;
    encroachment?: boolean;
    elevation_msl_m?: number;
  }>>([]);

  // Cinematic focus target: centroid of the selected parcel → MapLibre swoop.
  // Declared after liveParcels (temporal-dead-zone safe).
  const focusTarget = useMemo(() => {
    if (!selectedLiveParcelId) return null;
    const targetParcel = liveParcels.find((p) => p.parcel_id === selectedLiveParcelId);
    const ring = targetParcel?.footprint?.coordinates?.[0];
    if (!ring || ring.length === 0) return null;
    try {
      let sumLon = 0;
      let sumLat = 0;
      for (const coord of ring) {
        sumLon += coord[0];
        sumLat += coord[1];
      }
      return {
        lon: sumLon / ring.length,
        lat: sumLat / ring.length,
        zoom: 19.5,
        pitch: 65,
        bearing: Math.floor(Math.random() * 60) - 30,
        duration: 2500,
      };
    } catch (e) {
      console.error('FlyTo coordinate calculation failed:', e);
      return null;
    }
  }, [selectedLiveParcelId, liveParcels]);
  const [hoverBlock, setHoverBlock] = useState<string | null>(null);
  const [showCity, setShowCity] = useState(true);
  const [showPipes, setShowPipes] = useState(true);
  const [showTerrain, setShowTerrain] = useState(true);
  const [showLiveParcels, setShowLiveParcels] = useState(true);
  const [xray, setXray] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [subUtils, setSubUtils] = useState<any[]>([]);
  const [shadowAudit, setShadowAudit] = useState(false);
  const [dayOfYear, setDayOfYear] = useState<number>(() => {
    const now = new Date();
    return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  });
  const [lidarTarget, setLidarTarget] = useState('');
  const [lidarRunning, setLidarRunning] = useState(false);
  const [lidarJob, setLidarJob] = useState<{
    status: string;
    result?: Record<string, unknown> | null;
    error?: string | null;
  } | null>(null);
  const lidarRun = useRef(0);
  const [cityMeta, setCityMeta] = useState<{ origin: { lon: number; lat: number }; radiusM: number } | null>(null);
  const [osmCatalog, setOsmCatalog] = useState<OsmBuilding[] | null>(null);
  const [osmSelected, setOsmSelected] = useState<string | null>(null);
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
    setOsmSelected(null);
    setOsmFloorId(null);
    setOsmUnitId(null);
    setReportSearch('');
    setOwnershipFilter('ALL');
    setMinimumMarketValue(0);
    setZMax(36 * (bldg.height_m > 0 ? bldg.height_m / DEMO_HEIGHT_M : 1));
  };

  const skipCityOnce = useRef(false);
  const runLidar = async () => {
    const target = lidarTarget.trim() || building.id;
    const runId = ++lidarRun.current;
    setLidarRunning(true);
    try {
      const jobId = await startAiJob('lidar_elevation', target);
      const done = await pollAiJob(jobId, {
        intervalMs: 1000,
        isCancelled: () => lidarRun.current !== runId,
      });
      if (lidarRun.current !== runId) return;
      setLidarJob(done);
    } catch (e) {
      if (lidarRun.current === runId) {
        setLidarJob({ status: 'FAILED', error: e instanceof Error ? e.message : 'Job failed' });
      }
    } finally {
      if (lidarRun.current === runId) setLidarRunning(false);
    }
  };

  useEffect(() => () => {
    lidarRun.current += 1;
  }, []);

  const handleGroundClick = useCallback(async (e: ThreeEvent<MouseEvent>) => {
    if (!liveCaptureMode || liveCaptureLoading) return;
    e.stopPropagation();
    // World (building-local metres, Y-up, north = -z) back to lon/lat.
    const east = e.point.x;
    const north = -e.point.z;
    const cosLat = Math.cos((origin[1] * Math.PI) / 180);
    const lon = origin[0] + east / (111320 * cosLat);
    const lat = origin[1] + north / 111320;
    setLiveCaptureLoading(true);
    try {
      const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
      const res = await fetch(`${base}/api/ai/extract-live-building`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lon, building_height_m: 12.0 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.status !== 'PENDING_REVIEW' || typeof data?.proposal_id !== 'string') {
        throw new Error('Unexpected review-gate response');
      }
      const src = data.source === 'vision'
        ? 'vision-detected footprint'
        : data.source === 'osm'
          ? 'live-map OSM building footprint'
          : 'synthetic fallback footprint';
      setLiveCaptureNotice(
        `Capture staged for human review — proposal ${String(data.proposal_id).slice(0, 8)}… (${src}). Nothing was added to the registry yet.`,
      );
    } catch {
      // Leave the report closed; exit capture mode so the user isn't stuck.
    } finally {
      setLiveCaptureLoading(false);
      setLiveCaptureMode(false);
    }
  }, [liveCaptureMode, liveCaptureLoading, origin]);

  const switchBuilding = (id: string, preset?: ViewPreset) => {
    if (id === building.id || source !== 'live') return;
    setHoverBlock(null);
    document.body.style.cursor = '';
    if (preset === 'bird') skipCityOnce.current = true;
    setSource('loading');
    loadLiveHierarchy(id)
      .then((d) => {
        setLiveData(d);
        setSummaries(d.summaries);
        setSource('live');
        resetForBuilding(d.building);
        if (preset) flyTo(preset);
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
    fetchCityBuildings()
      .then((list) => {
        if (!cancelled) setCityBuildings(list);
      })
      .catch(() => {
        /* neighbour layer stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const neighbours = useMemo(() => {
    if (source !== 'live') return [];
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
  const buildingPipes = useMemo(
    () => SYNTHETIC_PIPES.filter((p) => p.buildingId === building.id),
    [building],
  );
  const foundation: Box3 | null = useMemo(() => {
    if (buildingPipes.length === 0) return null;
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
  const cityVisible = showCity
    && cityAvailable
    && cityOffset !== null
    && Math.hypot(cityOffset[0], cityOffset[1]) <= (cityMeta?.radiusM ?? 0);

  // 4D temporal scrubber: epoch bounds fixed at mount so the slider is stable.
  const epochBounds = useMemo(() => ({
    min: Date.UTC(2015, 0, 1),
    max: Date.now(),
  }), []);
  const [targetEpochMs, setTargetEpochMs] = useState<number>(epochBounds.max);
  const isHistorical = targetEpochMs < epochBounds.max - 60000;

  // Debounced v2 time-travel fetch; max restores the live endpoint.
  useEffect(() => {
    if (!cityVisible) return;
    if (!isHistorical) {
      const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
      fetch(`${base}/api/cadastral-parcels`)
        .then((r) => {
          if (!r.ok) throw new Error('no live parcels');
          return r.json();
        })
        .then((list) => {
          if (Array.isArray(list)) setLiveParcels(list);
        })
        .catch(() => {
          /* keep current parcels on failure */
        });
      return;
    }
    const timer = window.setTimeout(() => {
      const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
      fetch(`${base}/api/v2/parcels/temporal?target_epoch=${new Date(targetEpochMs).toISOString()}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((fc) => {
          const feats = Array.isArray(fc?.features) ? fc.features : [];
          setLiveParcels(feats.map((f: any) => ({
            parcel_id: f.properties?.parcel_id,
            height_m: f.properties?.height_m ?? 12,
            footprint: f.geometry ?? null,
          })));
        })
        .catch(() => {
          /* keep current parcels on failure */
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [cityVisible, isHistorical, targetEpochMs]);

  // Live-mode re-poll so newly approved captures appear without reload.
  useEffect(() => {
    if (!cityVisible || isHistorical) return;
    let cancelled = false;
    const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const timer = setInterval(() => {
      fetch(`${base}/api/cadastral-parcels`)
        .then((r) => {
          if (!r.ok) throw new Error('no live parcels');
          return r.json();
        })
        .then((list) => {
          if (!cancelled && Array.isArray(list)) setLiveParcels(list);
        })
        .catch(() => {
          /* live-captured layer stays empty */
        });
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [cityVisible, isHistorical]);

  // Subterranean utilities: fetch once per city view (tile bbox).
  useEffect(() => {
    if (!cityVisible) return;
    let cancelled = false;
    const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const o = cityMeta?.origin ?? { lon: origin[0], lat: origin[1] };
    const r = cityMeta?.radiusM ?? 1400;
    const dLat = r / 111320;
    const dLon = r / (111320 * Math.cos((o.lat * Math.PI) / 180));
    fetch(`${base}/api/v2/utilities/subterranean?bbox=${o.lon - dLon},${o.lat - dLat},${o.lon + dLon},${o.lat + dLat}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((fc) => {
        if (!cancelled && Array.isArray(fc?.features)) setSubUtils(fc.features);
      })
      .catch(() => {
        /* underground layer stays empty */
      });
    return () => {
      cancelled = true;
    };
  }, [cityVisible, cityMeta, origin]);

  const pipeStatus = useMemo(() => {
    if (!cityVisible || !cityOffset) return [];
    return buildingPipes.map((p) => {
      if (!foundation) return { id: p.id, depth: p.depthM, dist: null as number | null, status: '—' };
      const gx = cityOffset[0], gz = -cityOffset[1];
      const a: Vec3 = [gx + p.a[0], -p.depthM, gz + p.a[1]];
      const b: Vec3 = [gx + p.b[0], -p.depthM, gz + p.b[1]];
      const dist = segBoxDist(a, b, foundation);
      return { id: p.id, depth: p.depthM, dist, status: classifyClearance(dist) };
    });
  }, [buildingPipes, foundation, cityVisible, cityOffset]);

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
      .catch(() => {
        /* OSM selection simply unavailable */
      });
    return () => {
      cancelled = true;
    };
  }, [cityMeta]);

  const osmRecord = osmCatalog?.find((r) => r.id === osmSelected) ?? null;
  const clearOsm = () => deselectOsm();
  const prevPresetRef = useRef<ViewPreset>('orbit');
  const selectOsm = (id: string) => {
    if (osmSelected === id) {
      deselectOsm();
      return;
    }
    prevPresetRef.current = viewPreset === 'focus' ? 'orbit' : viewPreset;
    setOsmSelected(id);
    setOsmFloorId(null);
    setOsmUnitId(null);
    setSelected(null);
    setSelectedFloorId(null);
    setSelectedScope(null);
    setInteriorTour(false);
    flyTo('focus');
  };
  const deselectOsm = () => {
    setOsmSelected(null);
    flyTo(prevPresetRef.current);
  };

  useEffect(() => {
    if (inspectorVisible) setOsmSelected(null);
  }, [inspectorVisible]);

  useEffect(() => {
    if (!osmSelected) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') deselectOsm();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [osmSelected]);

  const [osmFloorId, setOsmFloorId] = useState<string | null>(null);
  const [osmUnitId, setOsmUnitId] = useState<string | null>(null);

  const osmModel = useMemo(() => {
    if (!osmRecord || !cityVisible || !cityOffset) return null;
    // World-frame (x east, z with north = -z) bounds of the OSM footprint.
    const gx = cityOffset[0], gz = -cityOffset[1];
    const qx0 = gx + osmRecord.minX, qx1 = gx + osmRecord.maxX;
    const qz0 = gz + osmRecord.minZ, qz1 = gz + osmRecord.maxZ;
    const levels = osmRecord.levels && osmRecord.levels > 0
      ? osmRecord.levels
      : Math.max(1, Math.floor(osmRecord.height / 3.2));
    const h = 3.2;
    const cosLat = Math.cos((origin[1] * Math.PI) / 180);
    // World (wx, wz) -> lon/lat solved against the building origin, so
    // UnitMesh's own footprintToLocal lands back at this world spot.
    const toLonLat = (wx: number, wz: number): [number, number] => [
      origin[0] + wx / (111320 * cosLat),
      origin[1] + (-wz) / 111320,
    ];
    const mx = (qx0 + qx1) / 2, mz = (qz0 + qz1) / 2;
    const cells: Array<[number, number, number, number]> = [
      [qx0, qz0, mx, mz],
      [mx, qz0, qx1, mz],
      [qx0, mz, mx, qz1],
      [mx, mz, qx1, qz1],
    ];
    const cellArea = ((qx1 - qx0) / 2) * ((qz1 - qz0) / 2);
    const floorsOut: Floor[] = [];
    const unitsOut: Unit[] = [];
    for (let i = 0; i < levels; i++) {
      const fid = `osm-fl-${osmRecord.id}-${i}`;
      floorsOut.push({
        id: fid,
        building_id: `osm-${osmRecord.id}`,
        code: `L${String(i + 1).padStart(2, '0')}`,
        label: `Level ${i + 1} (OSM)`,
        z_min: i * h,
        z_max: (i + 1) * h,
        area_sqm: cellArea * 4,
      });
      cells.forEach(([cx0, cz0, cx1, cz1], ci) => {
        const ring: [number, number][] = [
          toLonLat(cx0, cz0), toLonLat(cx1, cz0), toLonLat(cx1, cz1), toLonLat(cx0, cz1), toLonLat(cx0, cz0),
        ];
        unitsOut.push({
          id: `osm-unit-${osmRecord.id}-${i}-${ci}`,
          floor_id: fid,
          code: `U${ci + 1}`,
          type: 'common',
          label: `OSM U${ci + 1}`,
          area_sqm: cellArea,
          volume_cum: cellArea * h,
          footprint: ring,
          hash: '',
          version: 1,
        });
      });
    }
    const shape = new THREE.Shape();
    // True footprint polygon (GLB-local [x, z] shifted into world frame),
    // same mapping pattern as footprintShape — not the bounding box.
    const poly = osmRecord.footprint;
    poly.forEach(([x, z], ci) => {
      // local frame: (east, north) = (wx, -wz)
      const wx = gx + x, wz = gz + z;
      if (ci === 0) shape.moveTo(wx, -wz);
      else shape.lineTo(wx, -wz);
    });
    shape.closePath();
    return { floors: floorsOut, units: unitsOut, shape };
  }, [osmRecord, cityVisible, cityOffset, origin]);

  const focusPose = useMemo(() => {
    if (!cityVisible || !cityOffset || !osmRecord) return null;
    const gx = cityOffset[0], gz = -cityOffset[1];
    const cx = gx + osmRecord.cx, cz = gz + osmRecord.cz;
    const span = Math.max(osmRecord.maxX - osmRecord.minX, osmRecord.maxZ - osmRecord.minZ);
    const d = Math.max(60, 2.5 * Math.max(span, osmRecord.height));
    return {
      pos: [cx + 0.7 * d, 0.6 * d, cz + 0.7 * d] as [number, number, number],
      tgt: [cx, osmRecord.height / 2, cz] as [number, number, number],
    };
  }, [cityVisible, cityOffset, osmRecord]);
  const pipeFocus = useMemo(() => {
    if (buildingPipes.length === 0 || !cityVisible || !cityOffset) return null;
    const gx = cityOffset[0], gz = -cityOffset[1];
    let sx = 0, sz = 0, n = 0;
    for (const p of buildingPipes) {
      for (const [px, pz] of [p.a, p.b]) {
        sx += gx + px;
        sz += gz + pz;
        n++;
      }
    }
    const mx = sx / n, mz = sz / n;
    return {
      pos: [mx + 40, 32, mz + 40] as [number, number, number],
      tgt: [mx, -2, mz] as [number, number, number],
    };
  }, [buildingPipes, cityVisible, cityOffset]);

  // Spatial tape measure: push intersection points, reset on 3rd click.
  const pushMeasurePoint = useCallback((p: THREE.Vector3) => {
    setMeasurePoints((prev) => (prev.length >= 2 ? [p.clone()] : [...prev, p.clone()]));
  }, []);

  // Satellite click → 3D explore: fly the twin camera to the selected parcel.
  const parcelFocus = useMemo(() => {
    if (!selectedLiveParcelId) return null;
    const parcel = liveParcels.find((p) => p.parcel_id === selectedLiveParcelId);
    const ring = parcel?.footprint?.coordinates?.[0];
    if (!ring || ring.length === 0) return null;
    let sumLon = 0;
    let sumLat = 0;
    for (const c of ring) {
      sumLon += c[0];
      sumLat += c[1];
    }
    const [lx, ly] = footprintToLocal(
      [[sumLon / ring.length, sumLat / ring.length]], origin[0], origin[1],
    )[0];
    const cx = lx;
    const cz = -ly;
    const h = Math.max(parcel?.height_m ?? 12, 1);
    const d = Math.max(60, 2.5 * h);
    return {
      pos: [cx + 0.7 * d, 0.6 * d, cz + 0.7 * d] as [number, number, number],
      tgt: [cx, h / 2, cz] as [number, number, number],
    };
  }, [selectedLiveParcelId, liveParcels, origin]);

  useEffect(() => {
    if (selectedLiveParcelId && parcelFocus) setCamNonce((n) => n + 1);
  }, [selectedLiveParcelId, parcelFocus]);

  const cityViews = useMemo(() => {
    if (!cityVisible || !cityOffset || !cityMeta) return null;
    const R = cityMeta.radiusM;
    const C: [number, number, number] = [cityOffset[0], 0, -cityOffset[1]];
    return {
      city: { pos: [C[0] + 0.9 * R, 0.75 * R, C[2] + 0.9 * R] as [number, number, number], tgt: C },
      plan: { pos: [C[0], 1.6 * R, C[2]] as [number, number, number], tgt: C },
      freeroam: { pos: [C[0] + 0.6 * R, 1.0 * R, C[2] + 0.6 * R] as [number, number, number], tgt: C },
    };
  }, [cityVisible, cityOffset, cityMeta]);

  const prevCityFlight = useRef<{ b: string; v: boolean }>({ b: '', v: false });
  useEffect(() => {
    const was = prevCityFlight.current;
    prevCityFlight.current = { b: building.id, v: cityVisible };
    if (skipCityOnce.current) {
      skipCityOnce.current = false;
      return;
    }
    if (cityVisible && (was.b !== building.id || !was.v)) {
      flyTo('city');
      setInteriorTour(false);
    }
  }, [building.id, cityVisible]);

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
    <div className="h-full w-full flex min-h-0 min-w-0 relative overflow-hidden" data-explorer-root>
      <div ref={canvasRef} className={`${splitView ? 'w-1/2' : 'flex-1'} relative min-h-0 min-w-0`} style={{ background: INK }}>
        <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [70, 60, 70], fov: 50 }}
          frameloop={weather === 'monsoon' ? 'always' : 'demand'}
          dpr={quality === 'low' ? 1 : quality === 'medium' ? [1, 1.5] : [1, 2]}
          shadows={shadowAudit || quality !== 'low'}
          gl={{ antialias: true, alpha: false, powerPreference: quality === 'low' ? 'low-power' : 'default' }}
          style={{ background: sky.bg, cursor: liveCaptureMode ? 'crosshair' : 'default' }}
        >
          {quality !== 'high' && <AdaptiveDpr pixelated />}
          <color attach="background" args={[sky.bg]} />
          <fog attach="fog" args={[sky.bg, cityVisible && cityMeta ? Math.max(sky.fogNear, 1.5 * cityMeta.radiusM) : sky.fogNear, cityVisible && cityMeta ? Math.max(sky.fogFar, 4 * cityMeta.radiusM) : sky.fogFar]} />
          <ambientLight intensity={sky.ambient} />
          <directionalLight position={[50, 80, 30]} intensity={sky.sun} color={sky.sunColor} castShadow={quality !== 'low' && !shadowAudit} shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]} />
          {shadowAudit && (
            <SolarRig
              hour={hourOfDay}
              dayOfYear={dayOfYear}
              latDeg={cityMeta?.origin.lat ?? 11.0168}
              extent={cityVisible && cityMeta ? cityMeta.radiusM : 500}
            />
          )}
          <directionalLight position={[-30, 40, -20]} intensity={sky.ambient} color={sky.sunColor} />
          <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.ambient]} />
          {showTerrain && (
          <Ground
            seeThrough={viewPreset === 'cutaway' || xray}
            size={cityVisible && cityMeta ? 3 * cityMeta.radiusM : 200 * fh}
            onGroundClick={handleGroundClick}
            onMeasureDown={(e) => {
              if (!measureMode) return;
              e.stopPropagation();
              pushMeasurePoint(e.point.clone());
            }}
          />
          )}
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
                  onPick={(x, z) => {
                    if (!osmCatalog) return;
                    const hit = pickOsmBuilding(osmCatalog, x, z);
                    if (hit) selectOsm(hit.id);
                  }}
                />
              </Suspense>
            </CityErrorBoundary>
          )}
          {cityVisible && osmRecord && cityOffset && (
            <OsmHighlight
              footprint={osmRecord.footprint}
              height={osmRecord.height}
              position={[cityOffset[0], 0, -cityOffset[1]]}
            />
          )}
          {showPipes && cityVisible && cityOffset && buildingPipes.length > 0 && (
            <UndergroundPipes
              pipes={buildingPipes}
              groupPos={[cityOffset[0], 0, -cityOffset[1]]}
              statuses={new Map(pipeStatus.map((p) => [p.id, p.status]))}
            />
          )}
          <MonsoonRain active={weather === 'monsoon'} count={quality === 'high' ? 350 : quality === 'medium' ? 200 : 120} />
          <BuildingAnchor shape={footprintShape} height={building.height_m} onClick={() => { setSelected(null); setSelectedFloorId(null); setSelectedScope('building'); }} />
          {source === 'live' && neighbours.map((nb) => (
            <NeighbourBlock
              key={nb.id}
              nb={nb}
              origin={origin}
              onSelect={(id) => switchBuilding(id, 'bird')}
              onHover={(name) => setHoverBlock(name)}
            />
          ))}
          {cityVisible && showLiveParcels && liveParcels.map((p) => (
            <LiveCapturedBlock
              key={p.parcel_id}
              parcel={p}
              origin={origin}
              lowPower={lowPower}
              ilimsMode={ilimsMode}
              selected={p.parcel_id === selectedLiveParcelId}
              measureMode={measureMode}
              onMeasure={pushMeasurePoint}
              onSelect={() => setSelectedLiveParcelId((prev) => (prev === p.parcel_id ? null : p.parcel_id))}
              onHover={(name) => setHoverBlock(name)}
            />
          ))}
          {xray && subUtils.length > 0 && (
            <SubterraneanNetwork features={subUtils} origin={origin} />
          )}
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
          {osmModel && showFloors && osmModel.floors.map((fl, fi) => (
            <FloorSlab
              key={fl.id}
              floor={fl}
              index={fi}
              shape={osmModel.shape}
              visible
              exploded={exploded}
              zMax={zMax}
              highlighted={osmFloorId === null || osmFloorId === fl.id}
              onClick={() => { setOsmFloorId((prev) => (prev === fl.id ? null : fl.id)); }}
            />
          ))}
          {osmModel && showUnits && osmModel.units.map((u) => {
            const fl = osmModel.floors.find((f) => f.id === u.floor_id)!;
            const fi = osmModel.floors.findIndex((f) => f.id === u.floor_id);
            const vis = (osmFloorId === null || osmFloorId === u.floor_id) && fl.z_max <= zMax;
            if (!vis) return null;
            return (
              <UnitMesh
                key={u.id}
                unit={u}
                floor={fl}
                floorIndex={fi}
                origin={origin}
                visible
                exploded={exploded}
                selected={osmUnitId === u.id}
                conflict={false}
                onClick={() => { setOsmUnitId((prev) => (prev === u.id ? null : u.id)); }}
              />
            );
          })}
          <ViewRig preset={viewPreset} interiorTour={interiorTour} buildingId={building.id} cam={cam} cityViews={cityViews} cityVisible={cityVisible} cityMeta={cityMeta} maxDistance={viewPreset === 'freeroam' && cityVisible && cityMeta ? 4 * cityMeta.radiusM : cityVisible && cityMeta ? 2.5 * cityMeta.radiusM : 250} focusPose={parcelFocus ?? focusPose} pipeFocus={pipeFocus} camNonce={camNonce} />
          {measurePoints.length > 0 && (
            <MeasurementLine points={measurePoints} onClear={() => setMeasurePoints([])} />
          )}
          {quality !== 'low' && (
            <EffectComposer>
              <Bloom intensity={1.5} luminanceThreshold={1} mipmapBlur />
              <SSAO color="black" intensity={50} luminanceInfluence={0.5} radius={0.4} />
            </EffectComposer>
          )}
        </Canvas>
        </div>

        <div className={`absolute top-3 left-3 bottom-28 z-10 ${compact ? 'w-44' : narrow ? 'w-52' : 'w-64'} flex flex-col gap-2 overflow-y-auto pointer-events-none`}>
          <CollapsePanel title="View Controls" open={openPanels.view} onToggle={() => togglePanel('view')}>
          {source === 'live' && (
            <div className="mb-2">
              <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, marginBottom: 4, letterSpacing: '0.12em' }}>BUILDING</div>
              <select
                value={building.id}
                onChange={(e) => switchBuilding(e.target.value)}
                className="w-full text-[10px] px-2 py-1.5 outline-none"
                style={{ background: SURFACE.input, color: PAPER, border: `2px solid ${INK}`, fontFamily: FONT.mono }}
              >
                {summaries.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {s.floorCount}f · {s.unitCount}u</option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs cursor-pointer mb-2" style={{ color: PAPER }}>
            <input type="checkbox" checked={exploded} onChange={(e) => setExploded(e.target.checked)} />
            Explode Floors
          </label>
          <Button
            domain="spatial"
            active={liveCaptureMode}
            onClick={() => setLiveCaptureMode((v) => !v)}
            style={{ width: '100%', marginBottom: 8, fontSize: 10 }}
            >
            {liveCaptureMode ? '◉ Live Capture: ON' : '◎ Live Capture Mode'}
          </Button>
          <Button
            domain="spatial"
            active={lowPower}
            onClick={() => setLowPower((v) => !v)}
            style={{ width: '100%', marginBottom: 8, fontSize: 10 }}
            >
            {lowPower ? '◉ Low Power: ON' : '◎ Low Power Mode'}
          </Button>
          <Button
            domain="spatial"
            active={ilimsMode}
            onClick={() => setIlimsMode((v) => !v)}
            style={{ width: '100%', marginBottom: 8, fontSize: 10 }}
            >
            {ilimsMode ? '◉ ILIMS Land Bank: ON' : '◎ ILIMS Land Bank Mode'}
          </Button>
          <Button
            domain="spatial"
            active={splitView}
            onClick={() => setSplitView((v) => !v)}
            style={{ width: '100%', marginBottom: 8, fontSize: 10 }}
            >
            {splitView ? '◉ Split 2D/3D: ON' : '◎ Split 2D/3D View'}
          </Button>
          <Button
            domain="spatial"
            active={xray}
            onClick={() => setXray((v) => !v)}
            style={{ width: '100%', marginBottom: 8, fontSize: 10 }}
            >
            {xray ? '◉ Deep Cadastre / X-Ray: ON' : '◎ Deep Cadastre / X-Ray'}
          </Button>
          <Button
            domain="spatial"
            active={shadowAudit}
            onClick={() => setShadowAudit((v) => !v)}
            style={{ width: '100%', marginBottom: 8, fontSize: 10 }}
            >
            {shadowAudit ? '◉ Shadow Audit: ON' : '◎ Shadow Audit Mode'}
          </Button>
          <Button
            domain="spatial"
            active={measureMode}
            onClick={() => { setMeasureMode((v) => !v); setMeasurePoints([]); }}
            style={{ width: '100%', marginBottom: 8, fontSize: 10 }}
            >
            {measureMode ? '◉ Measure: ON (click 2 pts)' : '⚏ Measure Distance'}
          </Button>
          {shadowAudit && (
            <div className="mb-2" style={{ border: `2px solid ${INK}`, background: DOMAIN.warn, padding: '8px 10px', boxShadow: `3px 3px 0 ${INK}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold" style={{ fontSize: 9, letterSpacing: '0.1em', color: INK }}>DAY OF YEAR</span>
                <span className="font-mono font-bold" style={{ fontSize: 11, color: INK, fontVariantNumeric: 'tabular-nums' }}>{dayOfYear}</span>
              </div>
              <input
                type="range"
                aria-label="Day of year"
                min={1}
                max={365}
                step={1}
                value={dayOfYear}
                onChange={(e) => setDayOfYear(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: INK }}
              />
              <div className="font-mono" style={{ fontSize: 8, color: INK, marginTop: 2 }}>
                Use TIME OF DAY in Environment & View · shadows follow the sun
              </div>
            </div>
          )}
          <CollapsePanel title={`Live-Captured (${liveParcels.length})`} open={openPanels.view} onToggle={() => togglePanel('view')}>
            {selectedLiveParcelId && (
              <Button
                domain="info"
                onClick={() => setSelectedLiveParcelId(null)}
                style={{ width: '100%', marginBottom: 8, fontSize: 10 }}
              >
                ✕ Clear Selection
              </Button>
            )}
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {liveParcels.map((parcel) => {
                const isSel = selectedLiveParcelId === parcel.parcel_id;
                return (
                  <div
                    key={parcel.parcel_id}
                    className="pointer-events-auto p-2 flex justify-between items-center gap-2"
                    style={{
                      background: isSel ? DOMAIN.spatial : SURFACE.raised,
                      border: `2px solid ${INK}`,
                      boxShadow: isSel ? `2px 2px 0 ${INK}` : `4px 4px 0 ${INK}`,
                      transform: isSel ? 'translate(1px, 1px)' : 'none',
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontFamily: FONT.display, fontWeight: 800, textTransform: 'uppercase', fontSize: 10, color: isSel ? INK : PAPER }}>
                        ULPIN: {parcel.parcel_id}
                      </p>
                      <p style={{ fontSize: 9, color: isSel ? INK : MUTED }}>
                        Height: {parcel.height_m}m
                        {parcel.encroachment ? ' · CONFLICT' : ''}
                      </p>
                      {parcel.encroachment && (
                        <button
                          type="button"
                          onClick={() => setSelectedLiveParcelId(parcel.parcel_id)}
                          title={findParcelOverlaps(parcel.parcel_id, liveParcels).map((o) => `${o.id}: ≈${o.volM3.toFixed(2)} m³`).join('\n') || 'Overlaps at least one other parcel solid'}
                          style={{ background: 'transparent', border: 'none', padding: 0, marginTop: 2, cursor: 'pointer', textAlign: 'left' }}
                        >
                          <Badge domain="conflict" style={{ fontSize: 8 }}>CONFLICT — WHY?</Badge>
                        </button>
                      )}
                    </div>
                    <Button
                      domain={isSel ? 'info' : 'spatial'}
                      onClick={() => setSelectedLiveParcelId(parcel.parcel_id)}
                      style={{ fontSize: 9, padding: '4px 8px', flexShrink: 0 }}
                    >
                      Locate ⌖
                    </Button>
                  </div>
                );
              })}
              {liveParcels.length === 0 && (
                <div style={{ fontSize: 10, color: MUTED }}>No live parcels yet — capture or approve some.</div>
              )}
            </div>
          </CollapsePanel>
          {liveCaptureNotice && (
            <div style={{ fontSize: 10, lineHeight: 1.5, color: INK, background: DOMAIN.warn, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, padding: '6px 10px', marginBottom: 8 }}>
              {liveCaptureNotice}
            </div>
          )}
          <div>
            <label className="block mb-1" style={{ fontSize: 10, color: MUTED }}>Z-Range: −3.5m — {zMax}m</label>
            <input type="range" min={-3.5} max={36} step={0.5} value={zMax} onChange={(e) => setZMax(parseFloat(e.target.value))} className="w-full" style={{ accentColor: DOMAIN.spatial }} />
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: `2px solid ${INK}` }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, marginBottom: 6, letterSpacing: '0.12em' }}>LIGHTING</div>
            <div className="grid grid-cols-2 gap-1">
              <Button
                domain="spatial"
                active={!isNight}
                onClick={() => { setLiveSync(false); setHourOfDay(12); }}
                style={{ flex: 1, fontSize: 10 }}
                >
                ☀ DAY
              </Button>
              <Button
                domain="spatial"
                active={isNight}
                onClick={() => { setLiveSync(false); setHourOfDay(0); }}
                style={{ flex: 1, fontSize: 10 }}
                >
                ☾ NIGHT
              </Button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer mt-3" style={{ color: PAPER }}>
            <input type="checkbox" checked={interiorTour} onChange={(e) => { setInteriorTour(e.target.checked); if (e.target.checked) flyTo('orbit'); }} />
            Interior Tour · zoom in
          </label>
          <div className="text-[9px] mt-1" style={{ color: MUTED }}>{interiorTour ? 'Close camera enabled — scroll to enter the floor layout.' : 'Enable to unlock close interior navigation.'}</div>
          </CollapsePanel>
          <CollapsePanel title="Environment & View" open={openPanels.env} onToggle={() => togglePanel('env')}>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 10, color: MUTED }}>TIME OF DAY</span>
                  <span style={{ fontSize: 10, color: DOMAIN.warn, fontFamily: FONT.mono }}>{formatHour(hourOfDay)} · {isNight ? 'Night' : 'Day'}</span>
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
                <label className="flex items-center gap-2 text-xs cursor-pointer mt-1" style={{ color: PAPER }}>
                  <input type="checkbox" checked={liveSync} onChange={(e) => setLiveSync(e.target.checked)} />
                  Live sync
                </label>
              </div>
              <div>
                <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, marginBottom: 4, letterSpacing: '0.12em' }}>WEATHER</div>
                <div className="grid grid-cols-3 gap-1">
                  {(['clear', 'clouds', 'monsoon'] as const).map((w) => (
                    <Button
                      domain="spatial"
                      active={weather === w}
                      key={w}
                      onClick={() => setWeather(w)}
                      style={{ flex: 1, fontSize: 10 }}
                      >
                      {w}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, marginBottom: 4, letterSpacing: '0.12em' }}>CAMERA VIEWS</div>
                <div className="grid grid-cols-1 gap-1">
                  {((cityVisible
                    ? [['freeroam', 'Free Roam'], ['city', 'City Overview'], ['orbit', 'Free Orbit'], ['bird', "Bird's Eye"], ['plan', 'Cadastral Plan'], ['cutaway', 'Underground Cutaway'], ['street', 'Street Walk · 1.7m']]
                    : [['orbit', 'Free Orbit'], ['bird', "Bird's Eye"], ['plan', 'Cadastral Plan'], ['cutaway', 'Underground Cutaway'], ['street', 'Street Walk · 1.7m']]) as [ViewPreset, string][]).map(([v, label]) => (
                    <div key={v}>
                      <Button
                        domain="spatial"
                        active={viewPreset === v}
                        onClick={() => { flyTo(v); if (v === 'street' || v !== 'orbit') setInteriorTour(false); }}
                        style={{ width: '100%', textAlign: 'left', fontSize: 10 }}
                        >
                        {label}
                      </Button>
                      {v === 'cutaway' && (
                        <div className="text-[9px] mt-0.5 px-1" style={{ color: MUTED }}>No utility data loaded — basement levels only</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, marginBottom: 4, letterSpacing: '0.12em' }}>LAYERS</div>
                <div className="space-y-1">
                  {([
                    [showGrid, setShowGrid, 'Reference grid'],
                    [showParcel, setShowParcel, 'Parcel boundary'],
                    [showFloors, setShowFloors, 'Floor slabs'],
                    [showUnits, setShowUnits, 'Property units'],
                    [showTerrain, setShowTerrain, 'Terrain surface'],
                    [showLiveParcels, setShowLiveParcels, 'Live-captured parcels'],
                  ] as const).map(([val, setVal, label]) => (
                    <label key={label} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: PAPER }}>
                      <input type="checkbox" checked={val} onChange={(e) => setVal(e.target.checked)} />
                      {label}
                    </label>
                  ))}
                  {cityAvailable && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: PAPER }}>
                      <input type="checkbox" checked={showCity} onChange={(e) => setShowCity(e.target.checked)} />
                      City context (OSM)
                    </label>
                  )}
                  {buildingPipes.length > 0 && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: PAPER }}>
                      <input type="checkbox" checked={showPipes} onChange={(e) => setShowPipes(e.target.checked)} />
                      Underground utilities (synthetic)
                    </label>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, marginBottom: 4, letterSpacing: '0.12em' }}>GRAPHICS QUALITY</div>
                <div className="grid grid-cols-3 gap-1">
                  {(['low', 'medium', 'high'] as const).map((q) => (
                    <Button
                      domain="spatial"
                      active={quality === q}
                      key={q}
                      onClick={() => setQuality(q)}
                      style={{ flex: 1, fontSize: 10 }}
                      >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, marginBottom: 4, letterSpacing: '0.12em' }}>AI LIDAR</div>
                <div className="flex gap-1 mb-1">
                  <input
                    value={lidarTarget}
                    onChange={(e) => setLidarTarget(e.target.value)}
                    placeholder={building.id}
                    aria-label="LIDAR target id"
                    className="flex-1 min-w-0 text-[10px] px-2 py-1 outline-none"
                    style={{ background: SURFACE.input, color: PAPER, border: `2px solid ${INK}`, fontFamily: FONT.mono }}
                  />
                  <Button
                    domain="ai"
                    onClick={() => void runLidar()}
                    disabled={lidarRunning}
                    style={{ fontSize: 10, padding: '4px 8px', flexShrink: 0 }}
                  >
                    Run
                  </Button>
                </div>
                {lidarRunning && (
                  <div className="text-[10px]" style={{ color: MUTED }}>Processing LIDAR…</div>
                )}
                {!lidarRunning && lidarJob?.status === 'COMPLETED' && lidarJob.result && (
                  <div className="text-[10px]" style={{ color: DOMAIN.ok }}>
                    z {Number(lidarJob.result.z_min).toFixed(1)}–{Number(lidarJob.result.z_max).toFixed(1)} m · {String(lidarJob.result.point_count_clean ?? '?')} pts
                  </div>
                )}
                {!lidarRunning && lidarJob?.status === 'FAILED' && (
                  <div className="text-[10px]" style={{ color: DOMAIN.conflict }}>
                    {(typeof lidarJob.error === 'string' && lidarJob.error) || 'Job failed'}
                  </div>
                )}
              </div>
            </div>
          </CollapsePanel>
          {buildingPipes.length > 0 && (
            <div className="pointer-events-auto" style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}` }}>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PAPER }}>Underground utilities · synthetic</div>
                  <Badge domain="info" style={{ fontSize: 8 }}>{pipeStatus.length} RUNS</Badge>
                </div>
                <div className="space-y-1">
                  {pipeStatus.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="truncate" style={{ color: MUTED }}>{p.id} · −{p.depth}m</span>
                      <span style={{ color: p.status === 'Conflict' ? DOMAIN.conflict : p.status === 'Within buffer' ? DOMAIN.warn : p.status === '—' ? MUTED : DOMAIN.ok }}>
                        {p.status}{typeof p.dist === 'number' ? ` · ${p.dist.toFixed(1)}m` : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-[9px] mt-1" style={{ color: MUTED }}>Synthetic demo utilities routed on OSM road lines — not surveyed.</div>
              </div>
            </div>
          )}
        </div>

        <div className={`absolute top-3 right-3 bottom-28 z-10 ${compact ? 'w-40' : narrow ? 'w-48' : 'w-56'} flex flex-col gap-2 overflow-y-auto pointer-events-none`}>
          <CollapsePanel
            title="Floor Isolation"
            open={openPanels.floor}
            onToggle={() => togglePanel('floor')}
            extra={(
              <Badge domain="spatial" style={{ fontSize: 9 }}>
                {selectedFloorId ? floors.find((fl) => fl.id === selectedFloorId)?.code : 'ALL'}
              </Badge>
            )}
          >
          <div className="space-y-1 max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => { setSelectedFloorId(null); setSelected(null); setSelectedScope(null); }}
              className="w-full flex items-center gap-2 text-left text-[11px] py-1 px-2"
              style={
                selectedFloorId === null
                  ? { background: DOMAIN.spatial, border: `2px solid ${INK}`, color: INK, fontWeight: 700 }
                  : { background: 'transparent', border: '2px solid transparent', color: PAPER }
              }
            >
              <span className="w-3 h-3 border border-current flex items-center justify-center">
                {selectedFloorId === null && <span className="w-1.5 h-1.5 bg-current" />}
              </span>
              <span className="flex-1">ALL FLOORS</span>
              <span className="text-[9px]" style={{ color: selectedFloorId === null ? INK : MUTED }}>{floors.length}</span>
            </button>
            {floors.map((fl) => (
              <button
                type="button"
                key={fl.id}
                onClick={() => { setSelectedFloorId(fl.id); setSelected(null); setSelectedScope('floor'); }}
                className="w-full flex items-center gap-2 text-left text-[11px] py-1 px-2"
                style={
                  selectedFloorId === fl.id
                    ? { background: DOMAIN.spatial, border: `2px solid ${INK}`, color: INK, fontWeight: 700 }
                    : { background: 'transparent', border: '2px solid transparent', color: PAPER }
                }
              >
                <span className="w-3 h-3 border border-current flex items-center justify-center">
                  {selectedFloorId === fl.id && <span className="w-1.5 h-1.5 bg-current" />}
                </span>
                <span className="flex-1 truncate">{fl.label}</span>
                <span className="text-[9px]" style={{ color: selectedFloorId === fl.id ? INK : MUTED }}>{fl.code}</span>
              </button>
            ))}
          </div>
          </CollapsePanel>
          <CollapsePanel
            title="Valuation Filters"
            open={openPanels.val}
            onToggle={() => togglePanel('val')}
            extra={reportFilterActive && (
              <Badge domain="warn" style={{ fontSize: 9 }}>{matchingFloorIds.size}/{floors.length}</Badge>
            )}
          >
          <input value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} placeholder="Search floor or owner…" className="w-full text-[10px] px-2 py-1.5 outline-none mb-2" style={{ background: SURFACE.input, color: PAPER, border: `2px solid ${INK}`, fontFamily: FONT.mono }} />
          <select value={ownershipFilter} onChange={(e) => setOwnershipFilter(e.target.value)} className="w-full text-[10px] px-2 py-1.5 outline-none mb-2" style={{ background: SURFACE.input, color: PAPER, border: `2px solid ${INK}`, fontFamily: FONT.mono }}>
            {ownershipOptions.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All ownership types' : option}</option>)}
          </select>
          <label className="block mb-1" style={{ fontSize: 9, color: MUTED }}>{source === 'live' ? 'Minimum market value · — (no backend source)' : `Minimum market value · ₹${minimumMarketValue.toLocaleString('en-IN')}`}</label>
          <input type="range" min={0} max={60000000} step={1000000} value={minimumMarketValue} disabled={source === 'live'} onChange={(e) => setMinimumMarketValue(Number(e.target.value))} className="w-full" style={{ accentColor: DOMAIN.record }} />
          <div className="grid grid-cols-2 gap-1 mt-2">
            <Button domain="info" style={{ fontSize: 9, padding: '6px 4px' }} onClick={() => downloadCsv(building, floors)}>CSV REPORT</Button>
            <Button domain="record" style={{ fontSize: 9, justifyContent: 'center' }} onClick={async () => { setPopupBlocked(false); setPopupBlocked(!(await printPdfReport(building, floors, units, spatialIDs))); }}>Generate SVAMITVA Passport & QR</Button>
          </div>
          {popupBlocked && <div className="mt-2" style={{ fontSize: 9, color: DOMAIN.warn }}>Download failed — check browser download permissions and retry.</div>}
          {reportFilterActive && matchingFloorIds.size === 0 && <div className="mt-2" style={{ fontSize: 9, color: DOMAIN.conflict }}>No floors match this filter.</div>}
          </CollapsePanel>
        </div>

        {liveCaptureLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, padding: '12px 20px' }}>
            <span style={{ fontSize: 11, color: PAPER, fontFamily: FONT.mono }}>Extracting 3D geometry & staging for review…</span>
          </div>
        )}

        {inspectorVisible && (
          <div className={`absolute bottom-3 right-3 z-10 w-[400px] ${compact ? 'max-w-[calc(100%-2rem)]' : narrow ? 'max-w-full' : 'max-w-[calc(100%-34rem)]'} max-h-[48%] flex flex-col pointer-events-none`} style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}>
            <div className="pointer-events-auto flex flex-col min-h-0">
            <button
              type="button"
              onClick={() => setInspOpen((v) => !v)}
              className="w-full flex items-center justify-between p-3 text-left shrink-0"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: PAPER, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: FONT.mono }}>Building Inspector</span>
              <span className="text-xs" style={{ color: MUTED }}>{inspOpen ? '▾' : '▸'}</span>
            </button>
            {inspOpen && (
              <div className="px-3 pb-3 space-y-3 overflow-y-auto">
                {source === 'demo' && <div style={{ fontSize: 9, color: MUTED }}>Demo data — not live backend</div>}
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: MUTED }}>Name</span>
                    <span className="truncate" style={{ color: PAPER }}>{building.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: MUTED }}>Parcel ID</span>
                    <span className="truncate" style={{ color: PAPER }}>{parcel.ulpin}<CopyBtn value={parcel.ulpin} /></span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: MUTED }}>3D identifier</span>
                    <span style={{ color: PAPER }}>—</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: MUTED }}>Storeys</span>
                    <span style={{ color: PAPER }}>{building.floors_count}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: MUTED }}>Total height</span>
                    <span style={{ color: PAPER }}>{building.height_m}m</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: MUTED }}>Footprint area</span>
                    <span style={{ color: PAPER }}>{footprintArea.toFixed(0)} m²</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, marginBottom: 4, letterSpacing: '0.12em' }}>FLOORS</div>
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
                        className="text-[10px] py-1 px-2"
                        style={
                          selectedFloorId === fl.id
                            ? { background: DOMAIN.spatial, color: INK, border: `2px solid ${INK}`, fontWeight: 700, fontFamily: FONT.mono }
                            : { background: SURFACE.raised, color: PAPER, border: `2px solid ${INK}`, fontFamily: FONT.mono }
                        }
                      >
                        {fl.code}
                      </button>
                    ))}
                  </div>
                </div>
                {inspectorFloor ? (
                  <div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, marginBottom: 4, letterSpacing: '0.12em' }}>UNITS · {inspectorFloor.code}</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {inspectorUnits.map((u) => {
                        const sid = spatialIDs.find((s) => s.unit_id === u.id)?.full ?? '—';
                        const isSel = selected?.id === u.id;
                        return (
                          <div
                            key={u.id}
                            onClick={() => { setSelected(u); setSelectedScope(null); setSelectedFloorId(u.floor_id); }}
                            className="px-2 py-1.5 cursor-pointer"
                            style={
                              isSel
                                ? { background: DOMAIN.spatial, border: `2px solid ${INK}` }
                                : { background: SURFACE.raised, border: `2px solid ${INK}` }
                            }
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span style={{ color: isSel ? INK : PAPER, fontWeight: isSel ? 700 : 400 }}>{u.label}</span>
                              <span className="capitalize" style={{ color: isSel ? INK : MUTED }}>{u.type}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[9px]" style={{ color: isSel ? INK : MUTED }}>
                              <span className="truncate" style={{ fontFamily: FONT.mono }}>{sid}</span>
                              {sid !== '—' && <CopyBtn value={sid} />}
                            </div>
                            <div className="text-[9px] mt-0.5" style={{ color: isSel ? INK : MUTED }}>
                              {inspectorFloor.z_min.toFixed(1)}m – {inspectorFloor.z_max.toFixed(1)}m · {u.area_sqm.toFixed(1)} m² · {volumeText(u.volume_cum)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: MUTED }}>Select a floor to list its units.</div>
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {cityVisible && osmRecord && !inspectorVisible && (
          <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[400px] ${compact ? 'max-w-[calc(100%-2rem)]' : 'max-w-[calc(100%-34rem)]'} max-h-[48%] flex flex-col pointer-events-none`} style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}>
            <div className="pointer-events-auto flex flex-col min-h-0">
            <div className="w-full flex items-center justify-between p-3 shrink-0">
              <span style={{ fontSize: 10, fontWeight: 700, color: PAPER, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: FONT.mono }}>OSM building (context)</span>
              <span className="flex items-center gap-2">
                <Badge domain="warn" style={{ fontSize: 9 }}>OSM · illustrative</Badge>
                <Button domain="info" onClick={clearOsm} aria-label="Close" style={{ fontSize: 10, padding: '2px 6px' }}>✕</Button>
              </span>
            </div>
            <div className="px-3 pb-3 space-y-1 text-[11px] overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: MUTED }}>OSM id</span>
                <span style={{ color: PAPER, fontFamily: FONT.mono }}>
                  {osmRecord.id}
                  {osmRecord.id.startsWith('w') && (
                    <a
                      href={`https://www.openstreetmap.org/way/${osmRecord.id.slice(1)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2" style={{ color: DOMAIN.warn, textDecoration: 'underline' }}
                    >
                      Open in OSM
                    </a>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: MUTED }}>Name</span>
                <span style={{ color: PAPER }}>{osmRecord.name || 'Unnamed'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: MUTED }}>Type</span>
                <span style={{ color: PAPER }}>{osmRecord.type || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: MUTED }}>Levels</span>
                <span style={{ color: PAPER }}>{osmRecord.levels ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: MUTED }}>Height</span>
                <span style={{ color: PAPER }}>
                  {osmRecord.height} m ({osmRecord.heightSource === 'osm_height' || osmRecord.heightSource === 'osm_levels' ? 'OSM tag' : 'assumed'})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: MUTED }}>Footprint area</span>
                <span style={{ color: PAPER }}>{Number.isFinite(osmRecord.area) ? `${osmRecord.area} m²` : '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: MUTED }}>Distance</span>
                <span style={{ color: PAPER }}>
                  {cityOffset ? `${Math.hypot(cityOffset[0] + osmRecord.cx, -cityOffset[1] + osmRecord.cz).toFixed(0)} m` : '—'}
                </span>
              </div>
              {(() => {
                const sf = osmModel?.floors.find((f) => f.id === osmFloorId) ?? null;
                const su = osmModel?.units.find((u) => u.id === osmUnitId) ?? null;
                if (!sf && !su) return null;
                return (
                  <>
                    {sf && (
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ color: MUTED }}>Floor</span>
                        <span style={{ color: PAPER }}>{sf.code} · {sf.z_min.toFixed(1)}–{sf.z_max.toFixed(1)}m</span>
                      </div>
                    )}
                    {su && (
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ color: MUTED }}>Unit</span>
                        <span style={{ color: PAPER }}>{su.label} · {su.area_sqm.toFixed(1)} m²</span>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="text-[9px] pt-1" style={{ color: MUTED }}>Context data — not a cadastral record. Heights are assumed unless tagged.</div>
              <div className="text-[9px]" style={{ color: MUTED }}>Synthetic subdivision of an OSM footprint — not cadastral records.</div>
            </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-16 left-3 md:hidden flex flex-col gap-2 z-30">
          <Button
            domain="record"
            active={mobilePanel === 'hierarchy'}
            onClick={() => setMobilePanel((p) => (p === 'hierarchy' ? null : 'hierarchy'))}
            style={{ fontSize: 10 }}
          >
            🏢 Hierarchy
          </Button>
          <Button
            domain="spatial"
            active={mobilePanel === 'inspector'}
            onClick={() => setMobilePanel((p) => (p === 'inspector' ? null : 'inspector'))}
            style={{ fontSize: 10 }}
          >
            📋 Inspector
          </Button>
        </div>

        {mobilePanel === 'hierarchy' && (
          <div className="md:hidden fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto" style={{ background: SURFACE.panel, borderTop: `3px solid ${INK}` }}>
            <div className="flex items-center justify-end p-2">
              <Button
                domain="info"
                onClick={() => setMobilePanel(null)}
                aria-label="Close panel"
                style={{ fontSize: 10, padding: '4px 8px' }}
              >
                ✕
              </Button>
            </div>
            <CadastralHierarchy className="w-full" />
          </div>
        )}

        <div className="absolute bottom-3 left-3 px-3 py-2 flex items-center gap-4" style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}` }}>
          <div className="text-center"><div className="text-sm font-bold" style={{ color: PAPER }}>{units.length}</div><div className="text-[9px]" style={{ color: MUTED }}>Units</div></div>
          <div className="w-px h-6" style={{ background: INK }}></div>
          <div className="text-center"><div className="text-sm font-bold" style={{ color: PAPER }}>{floors.length}</div><div className="text-[9px]" style={{ color: MUTED }}>Floors</div></div>
          <div className="w-px h-6" style={{ background: INK }}></div>
          <div className="text-center"><div className="text-sm font-bold" style={{ color: PAPER }}>{building.height_m}m</div><div className="text-[9px]" style={{ color: MUTED }}>Height</div></div>
          <div className="w-px h-6" style={{ background: INK }}></div>
          <div className="flex items-center gap-1" role="group" aria-label="Graphics quality">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <Button
                key={q}
                domain="info"
                active={quality === q}
                type="button"
                title={`Graphics quality: ${q}`}
                onClick={() => setQuality(q)}
                style={{ fontSize: 9, padding: '2px 6px' }}
              >
                {q === 'medium' ? 'Med' : q === 'high' ? 'High' : 'Low'}
              </Button>
            ))}
          </div>
          {conflicts.size > 0 && (
            <>
              <div className="w-px h-6" style={{ background: INK }}></div>
              <div className="text-center"><div className="text-sm font-bold" style={{ color: DOMAIN.conflict }}>{conflicts.size}</div><div className="text-[9px]" style={{ color: MUTED }}>Conflicts</div></div>
            </>
          )}
        </div>

        {cityVisible && (
          <div className="absolute bottom-14 right-3 px-2 py-1 max-w-56" style={{ background: SURFACE.panel, border: `2px solid ${INK}` }}>
            <div className="text-[9px]" style={{ color: MUTED }}>OSM context (not cadastral) - © OpenStreetMap contributors (ODbL) - heights assumed</div>
          </div>
        )}

        <div className="absolute bottom-3 right-3 px-3 py-2" style={{ background: SURFACE.panel, border: `2px solid ${INK}` }}>
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1"><StatusDot domain="ok" size={8} /><span style={{ color: MUTED }}>Apartment</span></div>
            <div className="flex items-center gap-1"><StatusDot domain="info" size={8} /><span style={{ color: MUTED }}>Parking</span></div>
            <div className="flex items-center gap-1"><StatusDot domain="warn" size={8} /><span style={{ color: MUTED }}>Commercial</span></div>
            {conflicts.size > 0 && <div className="flex items-center gap-1"><StatusDot domain="conflict" size={8} /><span style={{ color: MUTED }}>Conflict</span></div>}
          </div>
        </div>

        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 max-w-[calc(100%-34rem)] pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="px-3 py-1" style={{ background: SURFACE.panel, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}` }}>
              {osmRecord ? (
                <span className="text-[10px]" style={{ color: DOMAIN.warn }}>● OSM · illustrative</span>
              ) : source === 'live' ? (
                <span className="text-[10px]" style={{ color: DOMAIN.ok }}>● Live backend</span>
              ) : source === 'loading' ? (
                <span className="text-[10px]" style={{ color: MUTED }}>Loading…</span>
              ) : (
                <span className="text-[10px]" style={{ color: DOMAIN.warn }}>● Demo data</span>
              )}
            </div>
            {conflicts.size > 0 && (
              <Button
                domain="conflict"
                onClick={() => setConflictOpen((v) => !v)}
                aria-expanded={conflictOpen}
                style={{ fontSize: 10, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="fas fa-triangle-exclamation text-[10px]"></i>
                <span>{conflicts.size} overlaps</span>
              </Button>
            )}
          </div>
          {hoverBlock && (
            <div className="px-2 py-1 pointer-events-none" style={{ background: SURFACE.panel, border: `2px solid ${INK}` }}>
              <span className="text-[10px]" style={{ color: PAPER }}>{hoverBlock.startsWith('Live-captured') ? hoverBlock : `${hoverBlock} · simplified footprint`}</span>
            </div>
          )}
          {conflicts.size > 0 && conflictOpen && (
            <div className="px-4 py-3 max-w-lg pointer-events-auto" style={{ background: SURFACE.panel, border: `3px solid ${DOMAIN.conflict}`, boxShadow: `4px 4px 0 ${INK}` }}>
              <div className="flex items-start gap-2">
                <i className="fas fa-triangle-exclamation text-xs mt-0.5" style={{ color: DOMAIN.conflict }}></i>
                <div className="flex-1">
                  <div className="text-xs font-medium mb-1" style={{ color: DOMAIN.conflict }}>Volumetric Overlap Detected</div>
                  <div className="text-[11px]" style={{ color: MUTED }}>
                    The system detects duplicate or overlapping volumetric spatial claims using computational 3D topology validation.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      <div
        className={`${mobilePanel === 'inspector' ? 'fixed' : 'hidden'} md:absolute md:flex inset-x-0 bottom-0 md:inset-x-auto md:top-4 md:right-4 md:bottom-24 md:w-[22rem] z-40 max-h-[70vh] md:max-h-none overflow-y-auto no-scrollbar flex-shrink-0 flex-col`}
        style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}
      >
        <AnimatePresence>
          {selectedLiveParcelId && (
            <motion.div
              key="live-parcel-inspector"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <LiveParcelInspector
                parcelId={selectedLiveParcelId}
                encroachment={liveParcels.find((p) => p.parcel_id === selectedLiveParcelId)?.encroachment === true}
                parcels={liveParcels}
                onClose={() => setSelectedLiveParcelId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="p-4" style={{ borderBottom: `2px solid ${INK}` }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: PAPER, fontFamily: FONT.display }}>
              <StatusDot domain="spatial" size={8} />
              Inspector
            </h3>
            <button
              type="button"
              onClick={() => setMobilePanel(null)}
              aria-label="Close panel"
              className="md:hidden text-xs px-2 py-1"
              style={{ color: PAPER, background: SURFACE.raised, border: `2px solid ${INK}` }}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-4" style={{ borderBottom: `2px solid ${INK}` }}>
          {selected ? (
            <div className="space-y-3 ">
              <div style={{ background: SURFACE.raised, border: `2px solid ${INK}`, padding: 12 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.18em', color: DOMAIN.spatial, marginBottom: 4, fontWeight: 700 }}>SPATIAL IDENTIFIER</div>
                <div className="text-[11px] font-medium break-all" style={{ color: PAPER }}>{spatialIDs.find((s) => s.unit_id === selected.id)?.full}</div>
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
              <div style={{ background: SURFACE.raised, border: `2px solid ${INK}`, padding: 12 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.18em', color: DOMAIN.spatial, marginBottom: 4, fontWeight: 700 }}>Geometry Hash (SHA-256)</div>
                <div className="text-[9px] font-medium break-all" style={{ color: PAPER }}>{selected.hash}</div>
              </div>
              <div style={{ background: SURFACE.raised, border: `2px solid ${INK}`, padding: 12 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.18em', color: DOMAIN.spatial, marginBottom: 6, fontWeight: 700 }}>Validation Status</div>
                {conflicts.has(selected.id) ? (
                  <Badge domain="conflict">▲ CONFLICT DETECTED</Badge>
                ) : (
                  <Badge domain="ok">● VALID — NO OVERLAPS</Badge>
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
              <i className="fas fa-mouse-pointer text-2xl mb-2" style={{ color: MUTED }}></i>
              <p className="text-xs" style={{ color: MUTED }}>Click a building, floor, or unit in the 3D view</p>
            </div>
          )}
        </div>
        <div className="p-3" style={{ borderBottom: `2px solid ${INK}` }}>
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: MUTED }}></i>
            <input
              type="text"
              placeholder="Search units, IDs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2"
              style={{
                background: SURFACE.input, color: PAPER, border: `2px solid ${INK}`,
                fontFamily: FONT.mono, outline: 'none',
              }}
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
                className="w-full text-left px-3 py-2 text-xs"
                style={
                  isSelected
                    ? { background: DOMAIN.spatial, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}` }
                    : { background: 'transparent', border: '2px solid transparent' }
                }
              >
                <div className="flex items-center justify-between">
                  <span className="truncate" style={{ color: isSelected ? INK : PAPER, fontWeight: isSelected ? 700 : 400 }}>{u.label}</span>
                  <span className="text-[9px] ml-2 flex-shrink-0" style={{ color: isSelected ? INK : MUTED }}>{u.area_sqm}m²</span>
                </div>
                {sid && <div className="text-[9px] truncate mt-0.5" style={{ color: isSelected ? INK : MUTED }}>{sid.full}</div>}
              </button>
            );
          })}
        </div>
      </div>
      {/* 4D temporal dock: bottom-center command bar */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="pointer-events-auto flex items-center gap-4 px-6 py-3" style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}` }}>
          <span className="shrink-0" style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 9, letterSpacing: '0.14em', color: DOMAIN.temporal }}>4D TIME</span>
          <span className="shrink-0" style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 13, color: PAPER, fontVariantNumeric: 'tabular-nums', minWidth: 76, textAlign: 'center' }}>
            {new Date(targetEpochMs).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
          <input
            type="range"
            aria-label="Target epoch for time-travel parcels"
            min={epochBounds.min}
            max={epochBounds.max}
            step={30 * 24 * 3600 * 1000}
            value={targetEpochMs}
            onChange={(e) => setTargetEpochMs(Number(e.target.value))}
            className="w-48 md:w-64"
            style={{ accentColor: DOMAIN.temporal }}
          />
          <Badge domain={isHistorical ? 'temporal' : 'ok'}>
            {isHistorical ? 'HISTORICAL' : '● LIVE'}
          </Badge>
          {isHistorical && (
            <Button
              domain="temporal"
              onClick={() => setTargetEpochMs(epochBounds.max)}
              style={{ fontSize: 8, padding: '4px 10px' }}
            >
              LIVE
            </Button>
          )}
        </div>
      </motion.div>
      </div>
      {splitView && (
        <div className="w-1/2 flex flex-col min-h-0 self-stretch" style={{ borderLeft: `3px solid ${INK}`, background: SURFACE.app }}>
          <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ background: DOMAIN.spatial, borderBottom: `3px solid ${INK}` }}>
            <span className="mr-2" style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: INK }}>2D VIEW</span>
            {(['satellite', 'vector'] as const).map((m) => (
              <Button
                key={m}
                domain="spatial"
                active={map2DMode === m}
                onClick={() => setMap2DMode(m)}
                style={{ fontSize: 9, background: map2DMode === m ? INK : 'transparent', color: map2DMode === m ? DOMAIN.spatial : INK, borderColor: INK }}
              >
                {m === 'satellite' ? '▭ Satellite AOI' : '◉ Satellite 3D'}
              </Button>
            ))}
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
          {map2DMode === 'satellite' ? (
          <LiveMapPanel
            apiBase={(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}
            origin={cityMeta?.origin ?? { lon: origin[0], lat: origin[1] }}
            footprints={liveParcels}
            selectedParcelId={selectedLiveParcelId}
            onSelectParcel={setSelectedLiveParcelId}
          />
          ) : (
          <MapLibrePanel
            apiBase={(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}
            basemap="satellite"
            target={focusTarget}
            footprints={liveParcels}
            selectedParcelId={selectedLiveParcelId}
            onSelectParcel={setSelectedLiveParcelId}
          />
          )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3D Components ─────────────────────────────────────────────

type ViewPreset = 'orbit' | 'bird' | 'plan' | 'cutaway' | 'street' | 'city' | 'focus' | 'freeroam';
type CamPose = { pos: [number, number, number]; tgt: [number, number, number] };
type CamPoses = { home: CamPose; bird: CamPose; plan: CamPose; cutaway: CamPose; street: CamPose; interior: CamPose };

function ViewRig({ preset, interiorTour, buildingId, cam, cityViews, cityVisible, cityMeta, maxDistance, focusPose, pipeFocus, camNonce }: { preset: ViewPreset; interiorTour: boolean; buildingId: string; cam: CamPoses; cityViews: { city: CamPose; plan: CamPose; freeroam: CamPose } | null; cityVisible: boolean; cityMeta: { origin: { lon: number; lat: number }; radiusM: number } | null; maxDistance: number; focusPose: CamPose | null; pipeFocus: CamPose | null; camNonce: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const invalidate = useThree((s) => s.invalidate);
  const goal = useRef<{ pos: [number, number, number]; tgt: [number, number, number] } | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (interiorTour) goal.current = focusPose ?? cam.interior;
    else if (preset === 'bird') goal.current = cam.bird;
    else if (preset === 'plan') goal.current = cityViews?.plan ?? cam.plan;
    else if (preset === 'cutaway') goal.current = pipeFocus ?? cam.cutaway;
    else if (preset === 'street') goal.current = cam.street;
    else if (preset === 'city') goal.current = cityViews?.city ?? cam.home;
    else if (preset === 'freeroam') goal.current = cityViews?.freeroam ?? cam.home;
    else if (preset === 'focus') goal.current = focusPose ?? cam.home;
    else goal.current = first ? null : (focusPose ?? cam.home);
    invalidate();
  }, [preset, interiorTour, buildingId, cam, cityViews, focusPose, pipeFocus, camNonce, invalidate]);

  useEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    if (cityVisible && cityMeta) {
      c.near = 1;
      c.far = Math.max(4000, 6 * cityMeta.radiusM);
    } else {
      c.near = 0.1;
      c.far = 1000;
    }
    c.updateProjectionMatrix();
    invalidate();
  }, [cityVisible, cityMeta, camera, invalidate]);

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
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI / 2 - 0.05}
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

interface OsmBuilding {
  id: string;
  name: string;
  type: string;
  levels: number | null;
  height: number;
  heightSource: string;
  area: number;
  footprint: [number, number][];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cx: number;
  cz: number;
}

function pipOsm(x: number, z: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

function distPtSeg(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / len2)) : 0;
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
}

function pickOsmBuilding(list: OsmBuilding[], x: number, z: number): OsmBuilding | null {
  for (const b of list) {
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (pipOsm(x, z, b.footprint)) return b;
  }
  let best: OsmBuilding | null = null;
  let bestD = 2;
  for (const b of list) {
    if (x < b.minX - 2 || x > b.maxX + 2 || z < b.minZ - 2 || z > b.maxZ + 2) continue;
    const n = b.footprint.length;
    for (let i = 0; i < n; i++) {
      const a = b.footprint[i], c = b.footprint[(i + 1) % n];
      const d = distPtSeg(x, z, a[0], a[1], c[0], c[1]);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
  }
  return best;
}

function CityContext({ url, position, cutaway, quality, onPick }: {
  url: string;
  position: [number, number, number];
  cutaway: boolean;
  quality: 'low' | 'medium' | 'high';
  onPick: (x: number, z: number) => void;
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
  return (
    <primitive
      object={cloned}
      position={position}
      onClick={(e) => {
        const mesh = e.object as THREE.Mesh;
        if (!((mesh?.name || '').toLowerCase().startsWith('buildings'))) return;
        e.stopPropagation();
        const p = e.point.clone().sub(new THREE.Vector3(position[0], position[1], position[2]));
        onPick(p.x, p.z);
      }}
      onPointerOver={(e) => {
        const mesh = e.object as THREE.Mesh;
        if (!((mesh?.name || '').toLowerCase().startsWith('buildings'))) return;
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    />
  );
}

function OsmHighlight({ footprint, height, position }: {
  footprint: [number, number][];
  height: number;
  position: [number, number, number];
}) {
  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    footprint.forEach(([x, z], i) => {
      if (i === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: Math.max(height, 0.1), bevelEnabled: false, steps: 1 });
  }, [footprint, height]);
  useEffect(() => () => {
    geom.dispose();
  }, [geom]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geom), [geom]);
  useEffect(() => () => {
    edges.dispose();
  }, [edges]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial color="#22d3ee" transparent opacity={0.5} side={THREE.DoubleSide} />
      <lineSegments>
        <primitive object={edges} attach="geometry" />
        <lineBasicMaterial color="#a5f3fc" transparent opacity={0.9} />
      </lineSegments>
    </mesh>
  );
}

function UndergroundPipes({ pipes, groupPos, statuses }: {
  pipes: Array<{ id: string; a: [number, number]; b: [number, number]; depthM: number }>;
  groupPos: [number, number, number];
  statuses: Map<string, string>;
}) {
  const geoms = useMemo(() => pipes.map((p) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(p.a[0], -p.depthM, p.a[1]),
      new THREE.Vector3(p.b[0], -p.depthM, p.b[1]),
    ]);
    return { id: p.id, geom: new THREE.TubeGeometry(curve, 32, 0.35, 6, false) };
  }), [pipes]);
  useEffect(() => () => {
    for (const g of geoms) g.geom.dispose();
  }, [geoms]);
  const colorFor = (id: string) => {
    const s = statuses.get(id);
    if (s === 'Conflict') return '#ef4444';
    if (s === 'Within buffer') return '#fbbf24';
    return '#2dd4bf';
  };
  return (
    <group position={groupPos}>
      {geoms.map((g) => (
        <mesh key={g.id}>
          <primitive object={g.geom} attach="geometry" />
          <meshStandardMaterial color={colorFor(g.id)} transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  );
}

const Ground = memo(function Ground({ seeThrough, size = 200, onGroundClick, onMeasureDown }: {
  seeThrough?: boolean;
  size?: number;
  onGroundClick?: (e: ThreeEvent<MouseEvent>) => void;
  onMeasureDown?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.1, 0]}
      receiveShadow
      onClick={(e) => onGroundClick?.(e)}
      onPointerDown={(e) => onMeasureDown?.(e)}
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#0f1629" transparent={!!seeThrough} opacity={seeThrough ? 0.22 : 1} depthWrite={!seeThrough} />
    </mesh>
  );
}, (a, b) => a.seeThrough === b.seeThrough && a.size === b.size);

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

function NeighbourBlock({ nb, origin, onSelect, onHover }: {
  nb: { id: string; name: string; height_m: number; footprint: number[][] };
  origin: [number, number];
  onSelect: (id: string) => void;
  onHover: (name: string | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const geom = useMemo(() => {
    const pts = footprintToLocal(nb.footprint, origin[0], origin[1]);
    const closedDup = pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
    const ring = closedDup ? pts.slice(0, -1) : pts;
    const shape = new THREE.Shape();
    ring.forEach(([x, y], i) => {
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: Math.max(nb.height_m, 0.1), bevelEnabled: false, steps: 1 });
  }, [nb, origin]);
  useEffect(() => () => {
    geom.dispose();
  }, [geom]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geom), [geom]);
  useEffect(() => () => {
    edges.dispose();
  }, [edges]);
  return (
    <mesh
      position={[0, 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(nb.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(nb.name); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); onHover(null); document.body.style.cursor = 'default'; }}
    >
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial color="#94a3b8" transparent opacity={hovered ? 0.8 : 0.55} side={THREE.DoubleSide} />
      <lineSegments>
        <primitive object={edges} attach="geometry" />
        <lineBasicMaterial color={hovered ? '#ffffff' : '#cbd5e1'} transparent opacity={0.6} />
      </lineSegments>
    </mesh>
  );
}

const UTILITY_COLORS: Record<string, string> = {
  water: '#06b6d4',
  fiber: '#f97316',
  sewer: '#22c55e',
  power: '#F5C400',
};

const SubterraneanNetwork = memo(function SubterraneanNetwork({ features, origin }: {
  features: Array<{ properties: { id: string; utility_type: string }; geometry: { coordinates: number[][][] } | { coordinates: number[][] } | null }>;
  origin: [number, number];
}) {
  const tubes = useMemo(() => {
    const out: Array<{ id: string; color: string; points: [number, number, number][] }> = [];
    for (const f of features) {
      const coords = (f.geometry as any)?.coordinates as number[][] | undefined;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const pts: [number, number, number][] = [];
      for (const c of coords) {
        if (!Array.isArray(c) || c.length < 2) continue;
        const { x, y } = lonLatToLocal(c[0], c[1], origin[0], origin[1]);
        pts.push([x, typeof c[2] === 'number' ? c[2] : -2, -y]);
      }
      if (pts.length < 2) continue;
      out.push({
        id: f.properties.id,
        color: UTILITY_COLORS[f.properties.utility_type] ?? '#e2e8f0',
        points: pts,
      });
    }
    return out;
  }, [features, origin]);
  return (
    <group>
      {tubes.map((t) => (
        <mesh key={t.id}>
          <tubeGeometry args={[new THREE.CatmullRomCurve3(t.points.map((p) => new THREE.Vector3(...p))), 64, 0.35, 8, false]} />
          <meshStandardMaterial color={t.color} emissive={t.color} emissiveIntensity={2} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}, (a, b) => a.features === b.features && a.origin === b.origin);

function SolarRig({ hour, dayOfYear, latDeg, extent }: {
  hour: number; dayOfYear: number; latDeg: number; extent: number;
}) {
  const pos = useMemo(() => {
    const lat = (latDeg * Math.PI) / 180;
    const decl = (-23.44 * Math.PI) / 180 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
    const ha = ((hour - 12) / 12) * Math.PI;
    const sinAlt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    const cosAz = (Math.sin(decl) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat) + 1e-9);
    const az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * (ha > 0 ? 1 : -1);
    const D = Math.max(extent * 2, 500);
    const el = Math.max(alt, 0.06);
    return [
      D * Math.cos(el) * Math.sin(az),
      D * Math.sin(el),
      -D * Math.cos(el) * Math.cos(az),
    ] as [number, number, number];
  }, [hour, dayOfYear, latDeg, extent]);
  const ortho = Math.max(extent * 1.2, 300);
  return (
    <directionalLight
      position={pos}
      intensity={2.2}
      color="#fff4e0"
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-ortho}
      shadow-camera-right={ortho}
      shadow-camera-top={ortho}
      shadow-camera-bottom={-ortho}
      shadow-camera-near={1}
      shadow-camera-far={Math.max(extent * 6, 2000)}
      shadow-bias={-0.0004}
    />
  );
}

/** Analytic overlap explainer (frontend mirror of the backend formula):
 * 2D footprint-intersection area (Sutherland–Hodgman clip + equirectangular
 * shoelace) × overlapping z-range. Exact for vertical-prism extrusions. */
export function findParcelOverlaps(
  parcelId: string,
  parcels: Array<{ parcel_id: string; height_m: number; elevation_msl_m?: number; footprint: { type: string; coordinates: number[][][] } | null }>,
): Array<{ id: string; volM3: number }> {
  type Pt = [number, number];
  const subj = parcels.find((p) => p.parcel_id === parcelId);
  const ringOf = (p: { footprint: { coordinates: number[][][] } | null }): Pt[] | null => {
    const ring = p.footprint?.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 3) return null;
    return ring.map(([x, y]) => [x, y]);
  };
  const sRing = subj ? ringOf(subj) : null;
  if (!subj || !sRing) return [];
  const sZ0 = subj.elevation_msl_m ?? 0;
  const sZ1 = sZ0 + Math.max(subj.height_m || 0, 0);
  // Stored rings have mixed winding (some CW, some CCW) and may be concave;
  // Sutherland–Hodgman needs a convex clip window, so both rings are
  // fan-free triangulated (ear clipping) and intersected triangle-by-triangle
  // (triangles are convex, so per-pair clipping is exact, including disjoint
  // multi-part overlaps which single-polygon clipping silently drops).
  const signedArea = (r: Pt[]): number => {
    let a = 0;
    for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    return a / 2;
  };
  const openRing = (r: Pt[]): Pt[] => {
    const c = r.slice();
    if (c.length > 1 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c.pop();
    if (signedArea([...c, c[0]]) < 0) c.reverse();
    return c;
  };
  const inTri = (p: Pt, a: Pt, b: Pt, c: Pt): boolean => {
    const s = (x: Pt, y: Pt, z: Pt) => (x[0] - z[0]) * (y[1] - z[1]) - (y[0] - z[0]) * (x[1] - z[1]);
    const d1 = s(p, a, b);
    const d2 = s(p, b, c);
    const d3 = s(p, c, a);
    const neg = d1 < -1e-12 || d2 < -1e-12 || d3 < -1e-12;
    const pos = d1 > 1e-12 || d2 > 1e-12 || d3 > 1e-12;
    return !(neg && pos);
  };
  const triangulate = (ring: Pt[]): Array<[Pt, Pt, Pt]> => {
    let vs = openRing(ring);
    const tris: Array<[Pt, Pt, Pt]> = [];
    let guard = vs.length * vs.length + 4;
    while (vs.length > 3 && guard-- > 0) {
      let cut = false;
      for (let i = 0; i < vs.length; i++) {
        const prev = vs[(i + vs.length - 1) % vs.length];
        const cur = vs[i];
        const next = vs[(i + 1) % vs.length];
        const cross = (cur[0] - prev[0]) * (next[1] - prev[1]) - (cur[1] - prev[1]) * (next[0] - prev[0]);
        if (cross <= 1e-15) continue;
        let blocked = false;
        for (let j = 0; j < vs.length; j++) {
          if (j === (i + vs.length - 1) % vs.length || j === i || j === (i + 1) % vs.length) continue;
          if (inTri(vs[j], prev, cur, next)) { blocked = true; break; }
        }
        if (blocked) continue;
        tris.push([prev, cur, next]);
        vs = vs.filter((_, k) => k !== i);
        cut = true;
        break;
      }
      if (!cut) break;
    }
    if (vs.length === 3) tris.push([vs[0], vs[1], vs[2]]);
    return tris;
  };
  const inside = (p: Pt, a: Pt, b: Pt) =>
    (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-12;
  const intersect = (p1: Pt, p2: Pt, a: Pt, b: Pt): Pt => {
    const d = [p2[0] - p1[0], p2[1] - p1[1]];
    const e = [b[0] - a[0], b[1] - a[1]];
    const denom = d[0] * e[1] - d[1] * e[0] || 1e-18;
    const t = ((a[0] - p1[0]) * e[1] - (a[1] - p1[1]) * e[0]) / denom;
    return [p1[0] + t * d[0], p1[1] + t * d[1]];
  };
  const areaM2 = (pts: Pt[]): number => {
    if (pts.length < 3) return 0;
    const clat = pts.reduce((t, p) => t + p[1], 0) / pts.length;
    const kx = 111320 * Math.cos((clat * Math.PI) / 180);
    let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = [pts[i][0] * kx, pts[i][1] * 111320];
      const [x1, y1] = [pts[(i + 1) % pts.length][0] * kx, pts[(i + 1) % pts.length][1] * 111320];
      acc += x0 * y1 - x1 * y0;
    }
    return Math.abs(acc) / 2;
  };
  const out: Array<{ id: string; volM3: number }> = [];
  const sTris = triangulate(sRing);
  if (sTris.length === 0) return [];
  for (const p of parcels) {
    if (p.parcel_id === parcelId) continue;
    const raw = ringOf(p);
    if (!raw) continue;
    const cTris = triangulate(raw);
    if (cTris.length === 0) continue;
    let interM2 = 0;
    for (const st of sTris) {
      for (const ct of cTris) {
        // Convex subject × convex (triangle) window: exact.
        let poly: Pt[] = [st[0], st[1], st[2], st[0]];
        for (let i = 0; i < 3; i++) {
          const a = ct[i];
          const b = ct[(i + 1) % 3];
          const next: Pt[] = [];
          for (let j = 0; j < poly.length; j++) {
            const cur = poly[j];
            const prev = poly[(j + poly.length - 1) % poly.length];
            const ci = inside(cur, a, b);
            const pi = inside(prev, a, b);
            if (ci) {
              if (!pi) next.push(intersect(prev, cur, a, b));
              next.push(cur);
            } else if (pi) {
              next.push(intersect(prev, cur, a, b));
            }
          }
          poly = next;
          if (poly.length === 0) break;
        }
        interM2 += areaM2(poly);
      }
    }
    const z0 = Math.max(sZ0, p.elevation_msl_m ?? 0);
    const z1 = Math.min(sZ1, (p.elevation_msl_m ?? 0) + Math.max(p.height_m || 0, 0));
    const oz = Math.max(0, z1 - z0);
    if (oz <= 0) continue;
    const vol = interM2 * oz;
    if (vol > 0.0001) out.push({ id: p.parcel_id, volM3: vol });
  }
  return out.sort((a, b) => b.volM3 - a.volM3);
}

function LiveParcelInspector({ parcelId, encroachment, parcels, onClose }: {
  parcelId: string;
  encroachment: boolean;
  parcels: Array<{ parcel_id: string; height_m: number; elevation_msl_m?: number; footprint: { type: string; coordinates: number[][][] } | null }>;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<any | null>(null);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeBusy, setNoticeBusy] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const overlaps = useMemo(() => findParcelOverlaps(parcelId, parcels), [parcelId, parcels]);

  const generateNotice = async () => {
    if (noticeBusy) return;
    setNoticeBusy(true);
    setNotice(null);
    try {
      const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
      const res = await fetch(`${base}/api/v2/legal/generate-notice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ulpin: parcelId,
          violation_type: 'air_rights',
          metrics: detail ? {
            spatial_delta_sqm: detail.footprint_area_sqm != null ? Number(detail.footprint_area_sqm.toFixed(2)) : null,
            intersection_volume_cum: detail.volume_cum != null ? Number(detail.volume_cum.toFixed(2)) : null,
            depth_m: null,
          } : {},
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setNotice(body.markdown ?? 'No notice returned.');
      setNoticeOpen(true);
    } catch {
      setNotice('Notice generation failed — backend unreachable.');
    } finally {
      setNoticeBusy(false);
    }
  };

  const printNotice = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w || !notice) return;
    const esc = notice.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    w.document.write(`<html><head><title>Enforcement Notice — ${parcelId}</title><style>body{font-family:Arial,sans-serif;color:#111;padding:32px;max-width:720px}h1{font-size:20px;border-bottom:3px solid #111;padding-bottom:8px}pre{white-space:pre-wrap;font-size:12px}</style></head><body><h1>DRAFT ENFORCEMENT NOTICE</h1><pre>${esc}</pre></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };
  useEffect(() => {
    let active = true;
    setDetail(null);
    setFailed(false);
    api.getCadastralParcel(parcelId).then((res) => {
      if (!active) return;
      if (res.success && res.data) setDetail(res.data);
      else setFailed(true);
    });
    return () => { active = false; };
  }, [parcelId]);
  const rows: Array<[string, string]> = detail ? [
    ['BUILDING ID', detail.parcel_id],
    ['3D ULPIN', detail.parcel_id],
    ['FOOTPRINT AREA', detail.footprint_area_sqm != null ? `${detail.footprint_area_sqm.toFixed(1)} m²` : '—'],
    ['PERIMETER', detail.perimeter_m != null ? `${detail.perimeter_m.toFixed(1)} m` : '—'],
    ['CENTROID', detail.centroid ? detail.centroid.coordinates.map((v: number) => v.toFixed(6)).join(', ') : '—'],
    ['HEIGHT', `${detail.height_m} m`],
    ['FLOORS (EST)', String(detail.floors_estimated)],
    ['VOLUME', detail.volume_cum != null ? `${detail.volume_cum.toFixed(1)} m³` : detail.fp_valid === false ? 'INVALID FOOTPRINT' : '—'],
    ['ELEVATION MSL', `${detail.elevation_msl_m} m`],
    ['GEOMETRY VERSION', `V01 (parcel record)`],
    ['GEOMETRY SOURCE', detail.geometry_source ?? '—'],
    ['IMAGERY PROVIDER', detail.imagery_provider ?? '—'],
    ['AI CONFIDENCE', detail.confidence != null ? String(detail.confidence) : '—'],
    ['HEIGHT SOURCE', `${detail.height_source ?? 'ESTIMATED'}${detail.height_source === 'ESTIMATED' ? ' — NOT SURVEY-GRADE' : ''}`],
  ] : [];
  return (
    <>
    <div className="overflow-hidden" style={{ background: 'transparent' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `2px solid ${INK}` }}>
        <div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.18em', color: DOMAIN.spatial, fontWeight: 700 }}>LIVE PARCEL</div>
          <div className="font-mono font-medium tracking-widest" style={{ fontSize: 13, color: DOMAIN.spatial }}>{parcelId}</div>
        </div>
        <Button domain="info" onClick={onClose} aria-label="Close parcel inspector" style={{ fontSize: 10, padding: '4px 8px' }}>✕</Button>
      </div>
      <div className="p-4">
      {failed && <Card><span style={{ fontSize: 11, color: DOMAIN.conflict }}>Inspector detail unavailable.</span></Card>}
      {!detail && !failed && <div className="animate-pulse space-y-2">{[0, 1, 2, 3].map((i) => (<div key={i} style={{ height: 12, background: SURFACE.raised, border: `2px solid ${INK}` }} />))}</div>}
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-2 py-1.5" style={{ borderBottom: `1px solid ${INK}` }}>
          <span className="text-[9px] uppercase tracking-widest shrink-0" style={{ color: MUTED }}>{k}</span>
          <span className="text-[11px] font-medium text-right break-all" style={{ color: PAPER }}>{v}</span>
        </div>
      ))}
      {detail && (
        <Button domain="spatial" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>
          OPEN 3D VIEW
        </Button>
      )}
      {encroachment && (
        <>
          <Card>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: DOMAIN.conflict, marginBottom: 6 }}>
              ▲ PHYSICAL OVERLAP — WHY THIS FLAG IS SET
            </div>
            <div style={{ fontSize: 10, color: PAPER, lineHeight: 1.5, marginBottom: 6 }}>
              This parcel's extruded solid intersects {overlaps.length > 0 ? overlaps.length : '≥1'} other parcel
              solid{overlaps.length === 1 ? '' : 's'} (PostGIS ST_3DIntersects, checked at approval time).
              Volumes below are analytic: 2D footprint-overlap area × height overlap.
            </div>
            {overlaps.length > 0 ? (
              <div className="flex flex-col gap-1">
                {overlaps.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2" style={{ fontFamily: FONT.mono, fontSize: 9 }}>
                    <span className="truncate" style={{ color: PAPER }}>{o.id}</span>
                    <span style={{ color: DOMAIN.conflict, fontWeight: 700, flexShrink: 0 }}>≈ {o.volM3.toFixed(2)} m³</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: MUTED }}>
                Partner volumes need 2D footprints + heights for every parcel — unavailable for this pair.
              </div>
            )}
          </Card>
          <Button
            domain="conflict"
            onClick={() => void generateNotice()}
            disabled={noticeBusy}
            style={{ width: '100%', marginTop: 12 }}
          >
            {noticeBusy ? 'DRAFTING…' : '▲ GENERATE ENFORCEMENT NOTICE'}
          </Button>
        </>
      )}
      {notice && !noticeOpen && (
        <Button domain="info" style={{ width: '100%', marginTop: 8 }} onClick={() => setNoticeOpen(true)}>
          VIEW DRAFT NOTICE
        </Button>
      )}
      </div>
    </div>
  );
  {noticeOpen && notice && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setNoticeOpen(false); }}>
      <div className="absolute inset-0" style={{ background: SURFACE.app, opacity: 0.8 }} />
      <div className="relative" style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`, maxWidth: 640, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `2px solid ${INK}` }}>
          <span className="text-xs font-semibold tracking-widest" style={{ color: PAPER }}>DRAFT ENFORCEMENT NOTICE</span>
          <Button domain="info" onClick={() => setNoticeOpen(false)} style={{ fontSize: 10, padding: '4px 8px' }} aria-label="Close notice">✕</Button>
        </div>
        <div className="overflow-y-auto no-scrollbar" style={{ padding: 16 }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: FONT.mono, fontSize: 11, color: PAPER, margin: 0 }}>{notice}</pre>
        </div>
        <div className="flex gap-2" style={{ padding: 14, borderTop: `2px solid ${INK}` }}>
          <Button domain="spatial" onClick={printNotice} style={{ fontSize: 11, padding: '8px 16px' }}>
            PRINT / EXPORT TO PDF
          </Button>
          <Button domain="info" onClick={() => setNoticeOpen(false)} style={{ fontSize: 11, padding: '8px 16px' }}>
            CLOSE
          </Button>
        </div>
      </div>
    </div>
  )}
    </>
  );
}

function MeasurementLine({ points, onClear }: { points: THREE.Vector3[]; onClear: () => void }) {
  if (points.length === 0) return null;
  const dist = points.length === 2 ? points[0].distanceTo(points[1]) : 0;
  const mid = points.length === 2
    ? new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5)
    : points[0].clone();
  return (
    <group>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.6, 12, 12]} />
          <meshBasicMaterial color="#22d3ee" />
        </mesh>
      ))}
      {points.length === 2 && (
        <>
          <Line points={[points[0], points[1]]} color="#22d3ee" lineWidth={2} dashed dashSize={2} gapSize={1.2} />
          <Html position={mid} center distanceFactor={60}>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 font-mono text-xs whitespace-nowrap" style={{ background: SURFACE.panel, color: DOMAIN.spatial, border: `2px solid ${INK}` }}>
                {dist.toFixed(2)}m
              </div>
              <Button
                domain="info"
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                style={{ fontSize: 10, padding: '4px 8px', fontFamily: FONT.mono }}
              >
                ✕
              </Button>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

const LiveCapturedBlock = memo(function LiveCapturedBlock({ parcel, origin, lowPower, ilimsMode, selected, measureMode, onMeasure, onSelect, onHover }: {
  parcel: { parcel_id: string; height_m: number; footprint: { type: string; coordinates: number[][][] } | null; encroachment?: boolean; elevation_msl_m?: number };
  origin: [number, number];
  lowPower: boolean;
  ilimsMode: boolean;
  selected: boolean;
  measureMode: boolean;
  onMeasure: (p: THREE.Vector3) => void;
  onSelect: () => void;
  onHover: (label: string | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const encroached = parcel.encroachment === true;
  // ILIMS land-bank density: log-scaled footprint volume proxy.
  // Dense/high → bright cyan; open/low → deep blue.
  const ilimsColor = useMemo(() => {
    const ring = parcel.footprint?.coordinates?.[0] ?? [];
    let area = 0;
    if (ring.length >= 3) {
      const clat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
      const kx = 111320 * Math.cos((clat * Math.PI) / 180);
      const pts = ring.map(([x, y]) => [x * kx, y * 111320]);
      for (let i = 0; i < pts.length - 1; i++) area += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
      area = Math.abs(area) / 2;
    }
    const vol = Math.max(area * Math.max(parcel.height_m, 0.1), 1);
    const t = Math.min(Math.max(Math.log10(vol) / 5, 0), 1);
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
    return `rgb(${lerp(30, 34)},${lerp(58, 211)},${lerp(138, 238)})`;
  }, [parcel]);
  const label = encroached
    ? `Live-captured (approved) · ${parcel.parcel_id} · ENCROACHMENT`
    : `Live-captured (approved) · ${parcel.parcel_id}`;
  useEffect(() => {
    if (encroached) console.warn(`Encroachment: approved parcel ${parcel.parcel_id} intersects an existing parcel solid`);
  }, [encroached, parcel.parcel_id]);
  const geom = useMemo(() => {
    const ring0 = parcel.footprint?.coordinates?.[0] ?? [];
    const pts = footprintToLocal(ring0, origin[0], origin[1]);
    const closedDup = pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
    const ring = closedDup ? pts.slice(0, -1) : pts;
    const shape = new THREE.Shape();
    ring.forEach(([x, y], i) => {
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: Math.max(parcel.height_m, 0.1), bevelEnabled: false, steps: 1 });
  }, [parcel, origin]);
  useEffect(() => () => {
    geom.dispose();
  }, [geom]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geom), [geom]);
  useEffect(() => () => {
    edges.dispose();
  }, [edges]);
  if (!parcel.footprint) return null;
  return (
    <mesh
      position={[0, 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={selected ? [1.02, 1.02, 1.02] : [1, 1, 1]}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); if (!measureMode) { onSelect(); } onHover(label); }}
      onPointerDown={(e) => {
        if (!measureMode) return;
        e.stopPropagation();
        onMeasure(e.point.clone());
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(label); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); onHover(null); document.body.style.cursor = 'default'; }}
    >
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial
        color={selected ? '#fbbf24' : ilimsMode ? ilimsColor : encroached ? '#ef4444' : '#a855f7'}
        emissive={selected ? '#d97706' : '#000000'}
        emissiveIntensity={selected ? 0.5 : 0}
        transparent={!lowPower && !selected}
        opacity={selected ? 1 : (lowPower ? 1 : (hovered ? 0.8 : 0.55))}
        side={THREE.DoubleSide}
      />
      {!lowPower && (
      <lineSegments>
        <primitive object={edges} attach="geometry" />
        <lineBasicMaterial color={encroached ? '#fecaca' : hovered ? '#ffffff' : '#e9d5ff'} transparent opacity={0.6} />
      </lineSegments>
      )}
    </mesh>
  );
}, liveBlockEqual);
// Custom compare: parcel identity + data + flags. Callbacks are stable by
// construction (state setters / useCallback), so HUD keystrokes that only
// touch other state skip these meshes entirely.
function liveBlockEqual(
  a: Readonly<{ parcel: { parcel_id: string; height_m: number; footprint: unknown; encroachment?: boolean; elevation_msl_m?: number }; origin: [number, number]; lowPower: boolean; ilimsMode: boolean; selected: boolean; measureMode: boolean }>,
  b: Readonly<{ parcel: { parcel_id: string; height_m: number; footprint: unknown; encroachment?: boolean; elevation_msl_m?: number }; origin: [number, number]; lowPower: boolean; ilimsMode: boolean; selected: boolean; measureMode: boolean }>,
): boolean {
  return (
    a.parcel.parcel_id === b.parcel.parcel_id &&
    a.parcel.height_m === b.parcel.height_m &&
    a.parcel.footprint === b.parcel.footprint &&
    a.parcel.encroachment === b.parcel.encroachment &&
    a.parcel.elevation_msl_m === b.parcel.elevation_msl_m &&
    a.origin === b.origin &&
    a.lowPower === b.lowPower &&
    a.ilimsMode === b.ilimsMode &&
    a.selected === b.selected &&
    a.measureMode === b.measureMode
  );
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

function InfoCell({ label, value }: any) {
  return (
    <div className="p-2.5" style={{ background: SURFACE.raised, border: `2px solid ${INK}` }}>
      <div className="font-mono text-[8px] tracking-[0.16em] mb-0.5" style={{ color: MUTED }}>{label}</div>
      <div className="text-xs font-semibold capitalize" style={{ color: PAPER }}>{value}</div>
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
      className="ml-1 text-[10px]"
      style={{ color: ok ? DOMAIN.ok : MUTED, background: 'transparent', border: 'none', cursor: 'pointer' }}
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
    <div className="space-y-3">
      <div className="p-3" style={{ background: SURFACE.raised, border: `2px solid ${INK}` }}>
        <div className="font-mono text-[9px] tracking-[0.18em] mb-1" style={{ color: DOMAIN.spatial }}>{kind} RECORD</div>
        <div className="text-sm font-semibold" style={{ color: PAPER }}>{title}</div>
        <div className="text-[10px] mt-1" style={{ color: MUTED }}>{subtitle}</div>
      </div>
      <div className="p-3" style={{ background: SURFACE.raised, border: `2px solid ${INK}` }}>
        <div className="font-mono text-[9px] tracking-[0.18em] mb-2" style={{ color: DOMAIN.spatial }}>Ownership</div>
        <div className="text-xs font-semibold mb-2" style={{ color: PAPER }}>{ownership?.ownerName ?? dash}</div>
        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="Title" value={ownership?.ownershipType ?? dash} />
          <InfoCell label="Tenure" value={ownership?.tenure ?? dash} />
          <InfoCell label="Share" value={ownership?.share ?? dash} />
          <InfoCell label="Verified" value={ownership?.lastVerified ?? dash} />
        </div>
      </div>
      <div className="p-3" style={{ background: SURFACE.raised, border: `2px solid ${INK}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[9px] tracking-[0.18em]" style={{ color: DOMAIN.spatial }}>Property Valuation</div>
          <Badge domain="spatial" style={{ fontSize: 9 }}>{valuation?.valuationYear ?? dash}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <InfoCell label="Market Value" value={valuation ? currency.format(valuation.marketValue) : dash} />
          <InfoCell label="Assessed Value" value={valuation ? currency.format(valuation.assessedValue) : dash} />
        </div>
        <div className="flex items-center justify-between text-[10px]" style={{ color: MUTED }}>
          <span>{valuation?.method ?? dash}</span>
          <Badge domain="ok" style={{ fontSize: 9 }}>{valuation ? `${Math.round(valuation.confidence * 100)}% CONF` : dash}</Badge>
        </div>
      </div>
    </div>
  );
}
