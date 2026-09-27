/**
 * SIH26011 - Sky/Lighting Utilities
 * Daylight factor, color mixing, and interpolation helpers
 */

export function dayLightFactor(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  const t = (h - 6) / 12;
  if (t <= 0 || t >= 1) return 0;
  const s = Math.sin(t * Math.PI);
  return s * s * (3 - 2 * s);
}

export function mixHex(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  const cr = Math.round(ca[0] + (cb[0] - ca[0]) * clamp01(t));
  const cg = Math.round(ca[1] + (cb[1] - ca[1]) * clamp01(t));
  const cb_ = Math.round(ca[2] + (cb[2] - ca[2]) * clamp01(t));
  return `#${cr.toString(16).padStart(2, '0')}${cg.toString(16).padStart(2, '0')}${cb_.toString(16).padStart(2, '0')}`;
}

export function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function formatHour(h: number): string {
  const norm = ((h % 24) + 24) % 24;
  const hh = Math.floor(norm);
  const mm = Math.floor((norm - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function parseColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [
    (bigint >> 16) & 255,
    (bigint >> 8) & 255,
    bigint & 255,
  ];
}