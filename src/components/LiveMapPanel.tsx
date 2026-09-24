import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PipelineStatus, { type PipeStep } from './PipelineStatus';

export interface LiveFootprint {
  parcel_id: string;
  footprint: { type: string; coordinates: number[][][] } | null;
  encroachment?: boolean;
}

interface Props {
  apiBase: string;
  origin: { lon: number; lat: number };
  footprints: LiveFootprint[];
  selectedParcelId: string | null;
  onSelectParcel: (id: string | null) => void;
}

const STEP_LABELS = [
  'Location selected',
  'AOI created',
  'Satellite imagery acquired',
  'Image preprocessing',
  'Building segmentation',
  'Footprint extraction',
  'Geometry validation',
  'Height estimation',
  '3D geometry generation',
  'Database persistence',
  'Cesium visualization',
];

type DrawMode = 'none' | 'rectangle' | 'polygon';

export default function LiveMapPanel({ apiBase, origin, footprints, selectedParcelId, onSelectParcel }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const aoiLayerRef = useRef<L.Layer | null>(null);
  const mosaicLayerRef = useRef<L.ImageOverlay | null>(null);
  const fpLayerRef = useRef<L.LayerGroup | null>(null);
  const drawPtsRef = useRef<L.LatLng[]>([]);
  const drawStartRef = useRef<L.LatLng | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [cursor, setCursor] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aoi, setAoi] = useState<any | null>(null);
  const [mosaic, setMosaic] = useState<any | null>(null);
  const [steps, setSteps] = useState<PipeStep[]>(STEP_LABELS.map((label) => ({ label, status: 'idle' })));
  const [stats, setStats] = useState<Record<string, string>>({});
  const t0Ref = useRef(0);

  const mark = (idx: number, status: PipeStep['status']) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, status } : s)));

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { zoomControl: true }).setView([origin.lat, origin.lon], 17);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri World Imagery', maxZoom: 19 },
    ).addTo(map);
    L.control.scale({ imperial: false }).addTo(map);
    fpLayerRef.current = L.layerGroup().addTo(map);
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursor(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (drawMode === 'polygon') {
        drawPtsRef.current = [...drawPtsRef.current, e.latlng];
        redrawDraft(map);
      }
    });
    map.on('dblclick', () => {
      if (drawMode === 'polygon' && drawPtsRef.current.length >= 3) finishPolygon(map);
    });
    map.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (drawMode !== 'rectangle') return;
      (map as any).dragging.disable();
      drawStartRef.current = e.latlng;
    });
    map.on('mouseup', (e: L.LeafletMouseEvent) => {
      if (drawMode !== 'rectangle' || !drawStartRef.current) return;
      (map as any).dragging.enable();
      const a = drawStartRef.current;
      const b = e.latlng;
      drawStartRef.current = null;
      finishRectangle(map, a, b);
    });
    mapRef.current = map;
    mark(0, 'done');
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render approved-parcel footprints; highlight selection from 3D.
  useEffect(() => {
    const group = fpLayerRef.current;
    if (!group) return;
    group.clearLayers();
    for (const fp of footprints) {
      const ring = fp.footprint?.coordinates?.[0];
      if (!ring || ring.length < 3) continue;
      const latlngs = ring.map(([lo, la]) => [la, lo] as [number, number]);
      const sel = fp.parcel_id === selectedParcelId;
      L.polygon(latlngs, {
        color: fp.encroachment ? '#D92D20' : sel ? '#111111' : '#F5C400',
        weight: sel ? 4 : 2,
        fillColor: fp.encroachment ? '#D92D20' : '#F5C400',
        fillOpacity: sel ? 0.45 : 0.15,
      })
        .bindTooltip(`${fp.parcel_id}${fp.encroachment ? ' · ENCROACHMENT' : ''}`)
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectParcel(fp.parcel_id === selectedParcelId ? null : fp.parcel_id);
        })
        .addTo(group);
    }
  }, [footprints, selectedParcelId, onSelectParcel]);

  function redrawDraft(map: L.Map) {
    if (aoiLayerRef.current) { map.removeLayer(aoiLayerRef.current); aoiLayerRef.current = null; }
    const pts = drawPtsRef.current;
    if (pts.length < 2) return;
    aoiLayerRef.current = L.polygon(pts, { color: '#111111', weight: 3, dashArray: '8 4', fillColor: '#F5C400', fillOpacity: 0.15 }).addTo(map);
  }

  function finishRectangle(map: L.Map, a: L.LatLng, b: L.LatLng) {
    const bounds = { min_lon: Math.min(a.lng, b.lng), min_lat: Math.min(a.lat, b.lat), max_lon: Math.max(a.lng, b.lng), max_lat: Math.max(a.lat, b.lat) };
    if (bounds.max_lon - bounds.min_lon < 1e-7 || bounds.max_lat - bounds.min_lat < 1e-7) return;
    setDrawMode('none');
    submitAoi(map, { type: 'rectangle', ...bounds });
  }

  function finishPolygon(map: L.Map) {
    const pts = drawPtsRef.current.map((p) => [p.lng, p.lat]);
    drawPtsRef.current = [];
    setDrawMode('none');
    submitAoi(map, { type: 'polygon', polygon: pts });
  }

  async function submitAoi(map: L.Map, raw: any) {
    setError(null);
    setBusy('Validating AOI…');
    t0Ref.current = Date.now();
    try {
      const res = await fetch(`${apiBase}/api/aoi/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aoi: raw }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
      const norm = (await res.json()).aoi;
      setAoi(norm);
      if (aoiLayerRef.current) map.removeLayer(aoiLayerRef.current);
      const latlngs = norm.polygon.map(([lo, la]: number[]) => [la, lo] as [number, number]);
      aoiLayerRef.current = L.polygon(latlngs, { color: '#111111', weight: 3, fillColor: '#F5C400', fillOpacity: 0.12 }).addTo(map);
      map.fitBounds(L.polygon(latlngs).getBounds().pad(0.1));
      mark(1, 'done');
      setStats((s) => ({ ...s, 'AOI area': `${norm.area_sqm.toFixed(0)} m²` }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AOI validation failed');
      mark(1, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function acquire() {
    if (!aoi || busy) return;
    setError(null);
    try {
      setBusy('Acquiring imagery…');
      mark(2, 'active');
      const res = await fetch(`${apiBase}/api/imagery/mosaic`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aoi: { type: aoi.type, min_lon: aoi.min_lon, min_lat: aoi.min_lat, max_lon: aoi.max_lon, max_lat: aoi.max_lat, polygon: aoi.polygon }, zoom: 19 }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
      const m = await res.json();
      setMosaic(m);
      const map = mapRef.current!;
      if (mosaicLayerRef.current) map.removeLayer(mosaicLayerRef.current);
      mosaicLayerRef.current = L.imageOverlay(
        `data:image/png;base64,${m.image_base64}`,
        [[m.aoi.min_lat, m.aoi.min_lon], [m.aoi.max_lat, m.aoi.max_lon]],
        { opacity: 0.85 },
      ).addTo(map);
      mark(2, 'done');
      mark(3, 'done');
      setStats((s) => ({
        ...s,
        'Mosaic': `${m.width_px}×${m.height_px}px · ${m.tile_count} tiles · ${m.imagery.cache}`,
        'Resolution': `${m.meters_per_pixel.toFixed(2)} m/px`,
        'Provider': m.imagery.provider,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mosaic failed');
      mark(2, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function detect() {
    if (!aoi || busy) return;
    setError(null);
    try {
      setBusy('Detecting buildings…');
      for (const i of [4, 5]) mark(i, 'active');
      const res = await fetch(`${apiBase}/api/ai/detect-batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aoi: { type: aoi.type, min_lon: aoi.min_lon, min_lat: aoi.min_lat, max_lon: aoi.max_lon, max_lat: aoi.max_lat, polygon: aoi.polygon }, zoom: 19, building_height_m: 12.0 }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
      const d = await res.json();
      const secs = ((Date.now() - t0Ref.current) / 1000).toFixed(1);
      for (const i of [4, 5, 6, 7, 8]) mark(i, 'done');
      mark(9, 'active');
      mark(10, 'idle');
      setStats((s) => ({
        ...s,
        'Detected': `${d.count} buildings`,
        'Elevation base': `${d.z_base_msl_m} m MSL`,
        'Pipeline time': `${secs}s`,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detection failed');
      mark(4, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function gotoSearch() {
    const q = search.trim();
    if (!q || busy) return;
    setError(null);
    try {
      setBusy('Searching…');
      if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(q)) {
        const [la, lo] = q.split(',').map(Number);
        mapRef.current?.setView([la, lo], 17);
        mark(0, 'done');
        return;
      }
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
        headers: { Accept: 'application/json' },
      });
      const hits = await res.json();
      if (!hits?.length) throw new Error('No results for query');
      mapRef.current?.setView([Number(hits[0].lat), Number(hits[0].lon)], 16);
      mark(0, 'done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap" style={{ background: '#FFFFFF', borderBottom: '3px solid #111111' }}>
        <div className="input-icon" style={{ flex: 1, minWidth: 140 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void gotoSearch(); }}
            placeholder="Search place or lat,lon…"
            className="bg-white/5 border border-white/10 rounded-md text-slate-200 font-mono"
            style={{ fontSize: 10 }}
          />
        </div>
        {(['none', 'rectangle', 'polygon'] as DrawMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { drawPtsRef.current = []; setDrawMode(m); }}
            className={`brutal-tab ${drawMode === m ? 'active' : ''}`}
            style={{ fontSize: 9, padding: '5px 10px' }}
          >
            {m === 'none' ? 'Pan' : m === 'rectangle' ? '▭ AOI' : '⬠ Polygon'}
          </button>
        ))}
        <button
          onClick={() => void acquire()}
          disabled={!aoi || !!busy}
          className="brutal-btn brutal-btn-gold"
          style={{ fontSize: 9, padding: '5px 10px' }}
        >
          Acquire
        </button>
        <button
          onClick={() => void detect()}
          disabled={!mosaic || !!busy}
          className="brutal-btn brutal-btn-primary"
          style={{ fontSize: 9, padding: '5px 10px' }}
        >
          Detect
        </button>
        <span className="brutal-badge" style={{ fontSize: 8 }}>ESRI SATELLITE</span>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <div ref={divRef} className="absolute inset-0" style={{ cursor: drawMode === 'none' ? undefined : 'crosshair' }} />
        <div className="absolute bottom-6 left-2 z-[500] glass rounded px-2 py-0.5 font-mono text-[9px] text-slate-300 pointer-events-none">
          {cursor || '—'}
        </div>
        {busy && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] glass rounded-full px-3 py-1 font-mono text-[10px] text-amber-200 pointer-events-none">
            <span className="status-led warning led-pulse" style={{ marginRight: 6 }} />{busy}
          </div>
        )}
        {error && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] rounded px-3 py-1 font-mono text-[10px] text-red-300 pointer-events-none" style={{ background: 'rgb(60 10 10 / 0.9)', border: '1px solid #7f1d1d' }}>
            {error}
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div className="shrink-0 max-h-44 overflow-y-auto border-t border-white/10">
        <PipelineStatus steps={steps} stats={stats} compact />
      </div>
    </div>
  );
}
