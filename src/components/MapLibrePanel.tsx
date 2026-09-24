import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LiveFootprint } from './LiveMapPanel';

export interface MapTarget {
  lon: number;
  lat: number;
  zoom?: number;
}

interface Props {
  apiBase: string;
  initial?: MapTarget;
  target?: MapTarget | null;
  footprints: LiveFootprint[];
  selectedParcelId: string | null;
  onSelectParcel: (id: string | null) => void;
  basemap?: 'streets' | 'satellite';
}

const STYLE_URL = {
  streets: 'https://api.maptiler.com/maps/streets-v2/style.json',
  satellite: 'https://api.maptiler.com/maps/satellite/style.json',
} as const;

const COIMBATORE = { lon: 76.9558, lat: 11.0168, zoom: 15 };
const SRC_LIVE = 'sih-live-parcels';
const SRC_REGISTRY = 'sih-registry-parcels';

function toFeatureCollection(items: Array<{ id: string; footprint: any; encroachment?: boolean; height_m?: number }>) {
  return {
    type: 'FeatureCollection' as const,
    features: items
      .filter((p) => p.footprint?.type && Array.isArray(p.footprint.coordinates))
      .map((p) => ({
        type: 'Feature' as const,
        id: p.id,
        properties: { parcel_id: p.id, encroachment: !!p.encroachment, height_m: p.height_m ?? 12 },
        geometry: p.footprint,
      })),
  };
}

function addExtrusions(m: maplibregl.Map) {
  // MapTiler planet buildings (when the style carries the vector source).
  try {
    const style = m.getStyle();
    const hasPlanet = !!style?.sources && Object.keys(style.sources).some((s) => /planet|openmaptiles/i.test(s));
    const srcName = style && Object.keys(style.sources).find((s) => /planet|openmaptiles/i.test(s));
    if (hasPlanet && srcName && !m.getLayer('sih-3d-buildings')) {
      const layers = style.layers ?? [];
      const labelIdx = layers.findIndex((l: any) => l.type === 'symbol' && /label/i.test(l.id ?? ''));
      const before = labelIdx >= 0 ? layers[labelIdx].id : undefined;
      m.addLayer({
        id: 'sih-3d-buildings',
        source: srcName,
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#F4F1E8',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'render_height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'render_min_height']],
          'fill-extrusion-opacity': 0.85,
        },
      }, before);
    }
  } catch {
    /* planet source absent in this style: cadastral extrusions still render */
  }
  // Our cadastral parcels as solid brutalist blocks (always available).
  try {
    if (!m.getLayer('sih-live-extrude') && m.getSource(SRC_LIVE)) {
      m.addLayer({
        id: 'sih-live-extrude',
        type: 'fill-extrusion',
        source: SRC_LIVE,
        paint: {
          'fill-extrusion-color': [
            'case',
            ['==', ['get', 'parcel_id'], ''],
            '#F4F1E8',
            ['get', 'encroachment'], '#D92D20',
            '#F4F1E8',
          ],
          'fill-extrusion-height': ['get', 'height_m'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9,
        },
      });
    }
  } catch {
    /* extrusion layer must never break the basemap */
  }
}

export default function MapLibrePanel({ apiBase, initial, target, footprints, selectedParcelId, onSelectParcel, basemap = 'streets' }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [cursor, setCursor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registryCount, setRegistryCount] = useState(0);
  const [diag, setDiag] = useState('STYLE: …');

  const key = import.meta.env.VITE_MAPTILER_API_KEY as string | undefined;
  const center0 = initial ?? COIMBATORE;

  // Create once; dispose on unmount (StrictMode-safe via ref guard).
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    if (!key) {
      setError('VITE_MAPTILER_API_KEY is not set. Add it to .env.local (git-ignored) and restart the dev server.');
      return;
    }
    let map: maplibregl.Map | null = null;
    try {
      map = new maplibregl.Map({
        container: divRef.current,
        style: `${STYLE_URL[basemap]}?key=${key}`,
        center: [center0.lon, center0.lat],
        zoom: center0.zoom ?? 15,
        pitch: basemap === 'satellite' ? 60 : 0,
        bearing: 0,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
      map.on('mousemove', (e: maplibregl.MapMouseEvent) => {
        setCursor(`${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`);
      });
      map.on('click', (e: maplibregl.MapMouseEvent) => {
        const feats = map!.queryRenderedFeatures(e.point, { layers: ['sih-live-fill', 'sih-reg-fill'] });
        const hit = feats.find((f: any) => f.properties && typeof f.properties.parcel_id === 'string');
        onSelectParcel(hit ? String((hit.properties as any).parcel_id) : null);
      });
      map.on('error', (ev: any) => {
        const msg = ev?.error?.message ?? ev?.error?.status ?? 'tile/style error';
        setDiag((d) => `${d} | ERR: ${String(msg).slice(0, 60)}`);
        setError('MapTiler request failed — check the API key and network connection.');
      });
      map.on('load', () => setDiag('STYLE: loaded'));
      map.on('idle', () => setDiag((d) => (d.startsWith('STYLE: loaded') ? 'STYLE: loaded · TILES: idle' : d)));
      mapRef.current = map;
    } catch {
      setError('Map initialization failed in this browser.');
    }
    return () => {
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registry parcels overlay (PostGIS source, fetched once).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !key) return;
    let cancelled = false;
    (async () => {
      try {
        const [parcelsRes, geomRes] = await Promise.all([
          fetch(`${apiBase}/api/parcels`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${apiBase}/api/3d/geometry`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;
        const items: Array<{ id: string; footprint: any }> = [];
        const push = (id: string, fp: any) => {
          if (id && fp?.type && Array.isArray(fp.coordinates)) items.push({ id, footprint: fp });
        };
        if (Array.isArray(parcelsRes)) {
          for (const p of parcelsRes) {
            const fp = p.footprint ?? p.geometry ?? p.geojson ?? p.geom;
            push(p.parcel_id ?? p.id, typeof fp === 'string' ? JSON.parse(fp) : fp);
          }
        }
        const g = geomRes?.parcels ?? geomRes?.land_parcels ?? [];
        if (Array.isArray(g)) {
          for (const p of g) {
            const fp = p.footprint ?? p.geometry;
            push(p.parcel_id ?? p.id, typeof fp === 'string' ? JSON.parse(fp) : fp);
          }
        }
        const fc = toFeatureCollection(items);
        setRegistryCount(fc.features.length);
        const addAll = () => {
          if (cancelled || !mapRef.current) return;
          const m = mapRef.current;
          if (m.getSource(SRC_REGISTRY)) return;
          m.addSource(SRC_REGISTRY, { type: 'geojson', data: fc });
          m.addLayer({
            id: 'sih-reg-fill', type: 'fill', source: SRC_REGISTRY,
            paint: { 'fill-color': '#F5C400', 'fill-opacity': 0.12 },
          });
          m.addLayer({
            id: 'sih-reg-line', type: 'line', source: SRC_REGISTRY,
            paint: { 'line-color': '#111111', 'line-width': 1.5, 'line-opacity': 0.85 },
          });
          m.addLayer({
            id: 'sih-reg-sel', type: 'line', source: SRC_REGISTRY,
            paint: { 'line-color': '#111111', 'line-width': 4 },
            filter: ['==', ['get', 'parcel_id'], ''],
          });
        };
        if (map.isStyleLoaded()) addAll();
        else map.once('load', addAll);
      } catch {
        /* registry overlay stays empty; live layer unaffected */
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase, key]);

  // Live-captured footprints overlay (same parcel IDs as the R3F twin).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !key) return;
    const fc = toFeatureCollection(
      footprints.map((p) => ({ id: p.parcel_id, footprint: p.footprint, encroachment: p.encroachment, height_m: p.height_m })),
    );
    const apply = () => {
      const m = mapRef.current;
      if (!m) return;
      const src = m.getSource(SRC_LIVE) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(fc);
        addExtrusions(m);
        return;
      }
      m.addSource(SRC_LIVE, { type: 'geojson', data: fc });
      m.addLayer({
        id: 'sih-live-fill', type: 'fill', source: SRC_LIVE,
        paint: { 'fill-color': '#F5C400', 'fill-opacity': 0.45 },
      });
      m.addLayer({
        id: 'sih-live-line', type: 'line', source: SRC_LIVE,
        paint: {
          'line-color': ['case', ['get', 'encroachment'], '#D92D20', '#111111'],
          'line-width': 2,
        },
      });
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [footprints, key]);

  // Selection highlight + fly-to from the 3D twin / search.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const paint = () => {
      const mm = mapRef.current;
      if (!mm) return;
      if (mm.getLayer('sih-reg-sel')) {
        mm.setFilter('sih-reg-sel', ['==', ['get', 'parcel_id'], selectedParcelId ?? '']);
      }
      const src = mm.getSource(SRC_LIVE) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        // Re-assert selection tint via filter-free repaint: swap selection layer.
        if (!mm.getLayer('sih-live-sel')) {
          mm.addLayer({
            id: 'sih-live-sel', type: 'line', source: SRC_LIVE,
            paint: { 'line-color': '#111111', 'line-width': 4 },
            filter: ['==', ['get', 'parcel_id'], ''],
          });
        }
        mm.setFilter('sih-live-sel', ['==', ['get', 'parcel_id'], selectedParcelId ?? '']);
      }
    };
    if (m.isStyleLoaded()) paint();
    else m.once('load', paint);
  }, [selectedParcelId]);

  useEffect(() => {
    if (target && mapRef.current) {
      mapRef.current.flyTo({ center: [target.lon, target.lat], zoom: target.zoom ?? 17, essential: true });
    }
  }, [target]);

  // Keep canvas sized to its container.
  useEffect(() => {
    if (!divRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(divRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: '#F4F1E8' }}>
      <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: '#FFFFFF', borderBottom: '3px solid #111111' }}>
        <span className="brutal-badge brutal-badge-black" style={{ fontSize: 8 }}>MAPTILER VECTOR</span>
        <span className="font-mono" style={{ fontSize: 8, color: '#555' }}>{diag}</span>
        <span className="brutal-badge" style={{ fontSize: 8 }}>{registryCount} REGISTRY</span>
        <span className="brutal-badge brutal-badge-gold" style={{ fontSize: 8 }}>{footprints.length} LIVE</span>
      </div>
      <div className="relative flex-1 min-h-0">
        <div ref={divRef} className="absolute inset-0" />
        <div className="absolute bottom-8 left-2 z-10 glass rounded px-2 py-0.5 font-mono text-[9px] text-slate-300 pointer-events-none">
          {cursor || '—'}
        </div>
        {error && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded px-3 py-1.5 font-mono text-[10px] text-amber-200 max-w-[90%]" style={{ background: 'rgb(40 30 8 / 0.92)', border: '1px solid rgb(201 154 69 / 0.5)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
