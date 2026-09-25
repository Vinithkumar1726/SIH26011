import { useState } from 'react';

export type AshState =
  | 'BOOT' | 'INITIALIZING' | 'WAITING_STYLE' | 'STYLE_READY'
  | 'TILES_LOADING' | 'RENDERING' | 'HEALTHY' | 'DEGRADED' | 'FAILED';

export interface AshError {
  time: string;
  source: string;
  message: string;
}

export interface AshSnapshot {
  state: AshState;
  engine: 'BOOT' | 'READY' | 'FAILED';
  style: 'WAITING' | 'LOADING' | 'LOADED' | 'FAILED';
  tiles: 'IDLE' | 'LOADING' | 'ACTIVE' | 'FAILED';
  sprites: 'WAITING' | 'LOADED' | 'FAILED';
  glyphs: 'WAITING' | 'LOADED' | 'FAILED';
  render: 'UNKNOWN' | 'RENDERING' | 'IDLE' | 'NO_TILES';
  webgl: 'UNKNOWN' | 'OK' | 'UNAVAILABLE';
  canvasW: number;
  canvasH: number;
  containerW: number;
  containerH: number;
  lon: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
  renderCount: number;
  errors: AshError[];
  viewportW: number;
  viewportH: number;
  docH: number;
  explorerH: number;
}

export interface DomTraceNode {
  index: number;
  tag: string;
  cls: string;
  display: string;
  position: string;
  width: string;
  height: string;
  minHeight: string;
  maxHeight: string;
  flex: string;
  flexDirection: string;
  flexGrow: string;
  flexShrink: string;
  gridRows: string;
  overflow: string;
}

/** Walk from the map container up through every ancestor. Development-only. */
export function traceMapAncestors(container: HTMLElement, depth = 14): DomTraceNode[] {
  const out: DomTraceNode[] = [];
  let el: HTMLElement | null = container;
  for (let i = 0; i < depth && el; i++) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    out.push({
      index: i,
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 6).join('.'),
      display: cs.display,
      position: cs.position,
      width: `${Math.round(r.width)}px`,
      height: `${Math.round(r.height)}px`,
      minHeight: cs.minHeight,
      maxHeight: cs.maxHeight,
      flex: cs.flex,
      flexDirection: cs.flexDirection,
      flexGrow: cs.flexGrow,
      flexShrink: cs.flexShrink,
      gridRows: cs.gridTemplateRows,
      overflow: cs.overflow,
    });
    el = el.parentElement;
  }
  return out;
}

export const ASH_IDLE: AshSnapshot = {
  state: 'BOOT',
  engine: 'BOOT',
  style: 'WAITING',
  tiles: 'IDLE',
  sprites: 'WAITING',
  glyphs: 'WAITING',
  render: 'UNKNOWN',
  webgl: 'UNKNOWN',
  canvasW: 0, canvasH: 0, containerW: 0, containerH: 0,
  lon: 0, lat: 0, zoom: 0, pitch: 0, bearing: 0,
  renderCount: 0,
  errors: [],
  viewportW: 0,
  viewportH: 0,
  docH: 0,
  explorerH: 0,
};

function dot(color: string) {
  return <span style={{ width: 9, height: 9, background: color, border: '2px solid #111', display: 'inline-block', flexShrink: 0 }} />;
}

function toneFor(ok: boolean, bad: boolean): string {
  if (bad) return '#D92D20';
  if (ok) return '#16A34A';
  return '#6B7280';
}

export function ashReportText(s: AshSnapshot): string {
  const lines = [
    '## SIH26011 ASH REPORT',
    '',
    `State: ${s.state}`,
    `Engine: ${s.engine}`,
    `Style: ${s.style}`,
    `Tiles: ${s.tiles}`,
    `Sprites: ${s.sprites}`,
    `Glyphs: ${s.glyphs}`,
    `Render: ${s.render} (frames: ${s.renderCount})`,
    `WebGL: ${s.webgl}`,
    '',
    `Canvas: ${s.canvasW}x${s.canvasH}`,
    `Container: ${s.containerW}x${s.containerH}`,
    '',
    `Longitude: ${s.lon.toFixed(6)}`,
    `Latitude: ${s.lat.toFixed(6)}`,
    `Zoom: ${s.zoom.toFixed(2)}`,
    `Pitch: ${s.pitch.toFixed(1)}`,
    `Bearing: ${s.bearing.toFixed(1)}`,
    '',
    `Errors: ${s.errors.length}`,
    ...s.errors.slice(0, 10).map((e) => `[${e.time}][${e.source}] ${e.message}`),
    '',
    `Viewport: ${s.viewportW}x${s.viewportH}`,
    `Document: ${s.docH}`,
    `ExplorerRoot: ${s.explorerH}`,
  ];
  return lines.join('\n');
}

export default function AshPanel({ snap, trace, onTrace }: {
  snap: AshSnapshot;
  trace: DomTraceNode[];
  onTrace: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const rows: Array<[string, string, string, boolean]> = [
    ['ENGINE', snap.engine, snap.engine === 'READY' ? '#16A34A' : snap.engine === 'FAILED' ? '#D92D20' : '#6B7280', snap.engine === 'FAILED'],
    ['STYLE', snap.style, snap.style === 'LOADED' ? '#16A34A' : snap.style === 'FAILED' ? '#D92D20' : '#F5C400', snap.style === 'FAILED'],
    ['TILES', snap.tiles, snap.tiles === 'ACTIVE' ? '#16A34A' : snap.tiles === 'FAILED' ? '#D92D20' : snap.tiles === 'IDLE' ? '#6B7280' : '#F5C400', snap.tiles === 'FAILED'],
    ['RENDER', snap.render, snap.render === 'IDLE' || snap.render === 'RENDERING' ? '#16A34A' : snap.render === 'NO_TILES' ? '#D92D20' : '#6B7280', snap.render === 'NO_TILES'],
    ['WEBGL', snap.webgl, snap.webgl === 'OK' ? '#16A34A' : snap.webgl === 'UNAVAILABLE' ? '#D92D20' : '#6B7280', snap.webgl === 'UNAVAILABLE'],
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ashReportText(snap));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div style={{ background: '#FFFFFF', border: '2px solid #111111', boxShadow: '3px 3px 0 #111111', fontFamily: 'var(--brutal-font-mono, monospace)' }}>
      <div className="flex items-center gap-2 px-2 py-1" style={{ borderBottom: '2px solid #111111', background: '#111111' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#F5C400' }}>ASH / MAPLIBRE SURFACE</span>
        <span style={{ fontSize: 8, color: '#fff', background: snap.state === 'HEALTHY' ? '#16A34A' : snap.state === 'FAILED' ? '#D92D20' : '#555', padding: '1px 6px', border: '1px solid #fff' }}>
          {snap.state}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle ASH diagnostics detail"
          style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, background: '#fff', color: '#111', border: '2px solid #F5C400', padding: '1px 8px', cursor: 'pointer' }}
        >
          {open ? 'HIDE DETAILS' : 'ASH DETAILS'}
        </button>
      </div>
      <div className="flex items-center gap-3 px-2 py-1 flex-wrap">
        {rows.map(([k, v, c, bad]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8, fontWeight: 700, color: bad ? '#D92D20' : '#111' }}>
            {dot(c)}{k} {v}
          </span>
        ))}
      </div>
      {open && (
        <div className="px-2 py-1" style={{ borderTop: '2px solid #111111', fontSize: 9, color: '#111' }}>
          <div className="grid gap-x-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <span>CANVAS <b>{snap.canvasW}×{snap.canvasH}</b></span>
            <span>CONTAINER <b>{snap.containerW}×{snap.containerH}</b></span>
            <span>CAMERA <b>{snap.lon.toFixed(4)} / {snap.lat.toFixed(4)}</b></span>
            <span>ZOOM <b>{snap.zoom.toFixed(2)}</b></span>
            <span>PITCH <b>{snap.pitch.toFixed(1)}°</b></span>
            <span>BEARING <b>{snap.bearing.toFixed(1)}°</b></span>
            <span>SPRITES <b>{snap.sprites}</b></span>
            <span>GLYPHS <b>{snap.glyphs}</b></span>
            <span>FRAMES <b>{snap.renderCount}</b></span>
            <span>ERRORS <b>{snap.errors.length}</b></span>
          </div>
          {snap.errors.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 120, overflowY: 'auto', border: '2px solid #D92D20', padding: 4 }}>
              {snap.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 8, color: '#111', wordBreak: 'break-all' }}>
                  [{e.time}][{e.source}] {e.message}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => void copy()}
            style={{ marginTop: 6, fontSize: 8, fontWeight: 700, background: '#F5C400', color: '#111', border: '2px solid #111', padding: '2px 10px', cursor: 'pointer' }}
          >
            {copied ? 'COPIED' : 'COPY DIAGNOSTICS'}
          </button>
          <button
            type="button"
            onClick={onTrace}
            aria-label="Trace map container ancestor heights"
            style={{ marginTop: 6, marginLeft: 6, fontSize: 8, fontWeight: 700, background: '#fff', color: '#111', border: '2px solid #111', padding: '2px 10px', cursor: 'pointer' }}
          >
            TRACE DOM HEIGHTS
          </button>
          {trace.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 220, overflowY: 'auto', border: '2px solid #111', padding: 4, background: '#fff' }}>
              {trace.map((n) => (
                <div key={n.index} style={{ fontSize: 8, color: Number.parseFloat(n.height) === 0 ? '#D92D20' : '#111', fontWeight: Number.parseFloat(n.height) === 0 ? 700 : 400, wordBreak: 'break-all' }}>
                  [{n.index}] {n.tag}{n.cls ? `.${n.cls}` : ''} {n.width}×{n.height} d:{n.display} pos:{n.position} flex:{n.flex} dir:{n.flexDirection} minH:{n.minHeight} over:{n.overflow}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function classifyAshError(err: any): string {
  const text = `${err?.url ?? ''} ${err?.message ?? ''} ${err?.status ?? ''}`.toLowerCase();
  if (/sprite/.test(text)) return 'SPRITE';
  if (/glyph|fontstack|fonts\//.test(text)) return 'GLYPH';
  if (/style\.json|style$|stylesheet/.test(text)) return 'STYLE';
  if (/\.pbf|tile/.test(text)) return 'TILE';
  if (/source/.test(text)) return 'SOURCE';
  return 'MAPLIBRE';
}

/** Strip query strings (keys/tokens) from URLs in error text. */
export function sanitizeAshText(text: string): string {
  return String(text ?? '').split('?')[0].slice(0, 220);
}
