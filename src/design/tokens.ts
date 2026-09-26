/**
 * SIH26011 NEO-BRUTALIST DESIGN SYSTEM — SINGLE SOURCE OF TRUTH
 * ============================================================
 * Every color, border, shadow, radius, and font used by the app's 2D chrome
 * MUST come from this file (via `src/design/primitives.tsx`). Do not hardcode
 * hex/rgb values, glass tokens (`bg-slate-900/60`, `backdrop-blur-xl`,
 * `border-white/10`), or ad-hoc shadow strings in screens/components.
 *
 * COLOR → DOMAIN MAPPING (use CONSISTENTLY, never invent a new color
 * for one of these concepts):
 * - spatial  (cyan #00E5FF)    — maps, GIS layers, parcels, footprints, AOI
 * - ai       (magenta #FF2EA6) — YOLO/vision, AI proposals, review queue
 * - ok       (lime #A3E635)    — validation passed, healthy, synced, active
 * - warn     (amber #FFB000)   — warnings, pending review, degraded states
 * - conflict (red #FF3B30)     — REAL conflicts/errors ONLY (overlaps,
 *                                encroachment, failed gates). Never decorative.
 * - temporal (violet #8B5CF6)  — 4D time-travel, history, version chains
 * - record   (gold #F5C400)    — cadastral records/registry identity, brand
 * - info     (blue #3B82F6)    — neutral informational accents
 *
 * SURFACES: app background stays near-black (#0B0E14); panels step up in
 * elevated dark neutrals so the 3px black borders + hard offset shadows read.
 * Text is paper (#F4F1E8); muted labels are slate (#9AA3B2).
 */

export const INK = '#000000';
export const PAPER = '#F4F1E8';
export const MUTED = '#9AA3B2';

export const SURFACE = {
  app: '#0B0E14',
  panel: '#131824',
  raised: '#1B2233',
  input: '#0E1320',
} as const;

export const DOMAIN = {
  spatial: '#00E5FF',
  ai: '#FF2EA6',
  ok: '#A3E635',
  warn: '#FFB000',
  conflict: '#FF3B30',
  temporal: '#8B5CF6',
  record: '#F5C400',
  info: '#3B82F6',
} as const;

export type DomainKey = keyof typeof DOMAIN;

/** Dark text on bright accents, paper text on dark/red/blue accents. */
export function onDomain(domain: DomainKey): string {
  switch (domain) {
    case 'spatial':
    case 'ok':
    case 'warn':
    case 'record':
      return INK;
    default:
      return PAPER;
  }
}

export const BORDER = '3px solid #000000';
export const BORDER_THIN = '2px solid #000000';
export const BORDER_THICK = '4px solid #000000';

export const SHADOW = '4px 4px 0 #000000';
export const SHADOW_SM = '3px 3px 0 #000000';
export const SHADOW_LG = '6px 6px 0 #000000';
export const SHADOW_PRESSED = '2px 2px 0 #000000';
export const SHADOW_NONE = '0 0 0 #000000';

/** Modal/scrim veil: near-black app surface at 72% alpha. The single
 * sanctioned translucent color — overlays must use this, never an
 * ad-hoc rgba()/glass blur. */
export const SCRIM = 'rgba(11, 14, 20, 0.72)';

export const RADIUS = 0;
export const RADIUS_SM = 2;

export const FONT = {
  display: "'Space Grotesk', sans-serif",
  body: "'IBM Plex Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const;

export const LABEL = {
  fontFamily: FONT.mono,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
} as const;
