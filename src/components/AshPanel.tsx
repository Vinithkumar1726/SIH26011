import { useState } from 'react';
import { Badge, Button, StatusDot } from '../design/primitives';
import { DOMAIN, FONT, INK, PAPER, SURFACE, type DomainKey } from '../design/tokens';

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
  paint: 'UNVERIFIED' | 'PAINTED' | 'BLANK';
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
  paint: 'UNVERIFIED',
  canvasW: 0, canvasH: 0, containerW: 0, containerH: 0,
  lon: 0, lat: 0, zoom: 0, pitch: 0, bearing: 0,
  renderCount: 0,
  errors: [],
  viewportW: 0,
  viewportH: 0,
  docH: 0,
  explorerH: 0,
};

/** Real-paint classifier (pure): do sampled RGBA pixels show a rendered
 * scene, or a blank/uniform surface? A live satellite frame always varies;
 * a blank canvas is one flat color (or fully transparent). */
export function classifyPainted(px: ArrayLike<number>): 'PAINTED' | 'BLANK' {
  const n = Math.floor(px.length / 4);
  if (n < 4) return 'BLANK';
  let r0 = 0;
  let g0 = 0;
  let b0 = 0;
  let diff = 0;
  for (let i = 0; i < n; i++) {
    const r = px[i * 4];
    const g = px[i * 4 + 1];
    const b = px[i * 4 + 2];
    if (i === 0) {
      r0 = r;
      g0 = g;
      b0 = b;
    } else if (Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0) > 24) {
      diff++;
      if (diff >= 3) return 'PAINTED';
    }
  }
  return 'BLANK';
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
    `Paint: ${s.paint}`,
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

  const rows: Array<[string, string, DomainKey, boolean]> = [
    ['ENGINE', snap.engine, snap.engine === 'READY' ? 'ok' : snap.engine === 'FAILED' ? 'conflict' : 'info', snap.engine === 'FAILED'],
    ['STYLE', snap.style, snap.style === 'LOADED' ? 'ok' : snap.style === 'FAILED' ? 'conflict' : 'warn', snap.style === 'FAILED'],
    ['TILES', snap.tiles, snap.tiles === 'ACTIVE' ? 'ok' : snap.tiles === 'FAILED' ? 'conflict' : snap.tiles === 'IDLE' ? 'info' : 'warn', snap.tiles === 'FAILED'],
    ['RENDER', snap.render, snap.render === 'IDLE' || snap.render === 'RENDERING' ? 'ok' : snap.render === 'NO_TILES' ? 'conflict' : 'info', snap.render === 'NO_TILES'],
    ['WEBGL', snap.webgl, snap.webgl === 'OK' ? 'ok' : snap.webgl === 'UNAVAILABLE' ? 'conflict' : 'info', snap.webgl === 'UNAVAILABLE'],
    ['PAINT', snap.paint, snap.paint === 'PAINTED' ? 'ok' : snap.paint === 'BLANK' ? 'conflict' : 'warn', snap.paint === 'BLANK'],
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
    <div style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, fontFamily: FONT.mono }}>
      <div className="flex items-center gap-2 px-2 py-1" style={{ borderBottom: `3px solid ${INK}`, background: DOMAIN.spatial }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: INK }}>ASH / MAPLIBRE SURFACE</span>
        <Badge domain={snap.state === 'HEALTHY' ? 'ok' : snap.state === 'FAILED' ? 'conflict' : 'warn'}>
          {snap.state}
        </Badge>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle ASH diagnostics detail"
          style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, background: INK, color: PAPER, border: `2px solid ${INK}`, padding: '1px 8px', cursor: 'pointer', fontFamily: FONT.mono }}
        >
          {open ? 'HIDE DETAILS' : 'ASH DETAILS'}
        </button>
      </div>
      <div className="flex items-center gap-3 px-2 py-1 flex-wrap">
        {rows.map(([k, v, d, bad]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8, fontWeight: 700, color: bad ? DOMAIN.conflict : PAPER }}>
            <StatusDot domain={d} size={8} />{k} {v}
          </span>
        ))}
      </div>
      {open && (
        <div className="px-2 py-1" style={{ borderTop: `2px solid ${INK}`, fontSize: 9, color: PAPER }}>
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
            <div style={{ marginTop: 6, maxHeight: 120, overflowY: 'auto', border: `2px solid ${DOMAIN.conflict}`, padding: 4 }}>
              {snap.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 8, color: PAPER, wordBreak: 'break-all' }}>
                  [{e.time}][{e.source}] {e.message}
                </div>
              ))}
            </div>
          )}
          <Button
            domain="spatial"
            onClick={() => void copy()}
            style={{ marginTop: 6, fontSize: 8, padding: '2px 10px' }}
          >
            {copied ? 'COPIED' : 'COPY DIAGNOSTICS'}
          </Button>
          <Button
            domain="info"
            onClick={onTrace}
            aria-label="Trace map container ancestor heights"
            style={{ marginTop: 6, marginLeft: 6, fontSize: 8, padding: '2px 10px' }}
          >
            TRACE DOM HEIGHTS
          </Button>
          {trace.length > 0 && (
            <div style={{ marginTop: 6, maxHeight: 220, overflowY: 'auto', border: `2px solid ${INK}`, padding: 4, background: SURFACE.input }}>
              {trace.map((n) => (
                <div key={n.index} style={{ fontSize: 8, color: Number.parseFloat(n.height) === 0 ? DOMAIN.conflict : PAPER, fontWeight: Number.parseFloat(n.height) === 0 ? 700 : 400, wordBreak: 'break-all' }}>
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
