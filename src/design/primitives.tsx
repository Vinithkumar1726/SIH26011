/**
 * Shared neo-brutalist primitives. All styling derives from `./tokens`
 * (inline styles only — no Tailwind classes, no CSS vars, no glass tokens),
 * so this file + tokens.ts are the entire 2D design system.
 */
import { useState, useEffect } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import {
  BORDER,
  BORDER_THIN,
  DOMAIN,
  FONT,
  INK,
  LABEL,
  MUTED,
  PAPER,
  RADIUS,
  SHADOW,
  SHADOW_PRESSED,
  SHADOW_SM,
  SURFACE,
  onDomain,
  type DomainKey,
} from './tokens';

/* Global shimmer animation - injected once */
if (typeof document !== 'undefined' && !document.getElementById('shimmer-style')) {
  const style = document.createElement('style');
  style.id = 'shimmer-style';
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ---------- Panel ---------- */

export function Panel({ title, eyebrow, right, accent, children, style }: {
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  accent?: DomainKey;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        background: SURFACE.panel,
        border: BORDER,
        boxShadow: SHADOW,
        borderRadius: RADIUS,
        ...style,
      }}
    >
      {accent && <div style={{ height: 6, background: DOMAIN[accent], borderBottom: BORDER }} />}
      {(title || eyebrow || right) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '10px 14px',
            borderBottom: BORDER_THIN,
          }}
        >
          <div>
            {eyebrow && (
              <div style={{ ...LABEL, color: accent ? DOMAIN[accent] : MUTED, marginBottom: 2 }}>
                {eyebrow}
              </div>
            )}
            {title && (
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: PAPER }}>
                {title}
              </div>
            )}
          </div>
          {right}
        </header>
      )}
      <div style={{ padding: 14 }}>{children}</div>
    </section>
  );
}

/* ---------- Card ---------- */

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: SURFACE.raised,
        border: BORDER_THIN,
        boxShadow: SHADOW_SM,
        borderRadius: RADIUS,
        padding: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- Button (physical press: shadow shrinks, face shifts) ---------- */

export function Button({ domain = 'record', active, size = 'md', style, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { domain?: DomainKey; active?: boolean; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const [pressed, setPressed] = useState(false);
  const down = pressed || active;
  const bg = active ? DOMAIN[domain] : SURFACE.raised;
  const fg = active ? onDomain(domain) : PAPER;
  const padding = size === 'xs' ? '4px 8px' : size === 'sm' ? '6px 10px' : size === 'lg' ? '12px 20px' : '8px 14px';
  const fontSize = size === 'xs' ? 9 : size === 'sm' ? 10 : size === 'lg' ? 12 : 10;
  return (
    <button
      {...rest}
      onMouseDown={(e) => { setPressed(true); rest.onMouseDown?.(e); }}
      onMouseUp={(e) => { setPressed(false); rest.onMouseUp?.(e); }}
      onMouseLeave={(e) => { setPressed(false); rest.onMouseLeave?.(e); }}
      style={{
        background: bg,
        color: fg,
        border: BORDER_THIN,
        boxShadow: down ? SHADOW_PRESSED : SHADOW_SM,
        transform: down ? 'translate(2px, 2px)' : 'translate(0, 0)',
        borderRadius: RADIUS,
        fontFamily: FONT.mono,
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding,
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        opacity: rest.disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ---------- Badge (domain-parameterized) ---------- */

export function Badge({ domain = 'info', children, style }: {
  domain?: DomainKey;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: DOMAIN[domain],
        color: onDomain(domain),
        border: BORDER_THIN,
        borderRadius: RADIUS,
        fontFamily: FONT.mono,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ---------- Input ---------- */

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { style?: CSSProperties }) {
  const { style, ...rest } = props;
  return (
    <input
      {...rest}
      style={{
        width: '100%',
        background: SURFACE.input,
        color: PAPER,
        border: BORDER_THIN,
        borderRadius: RADIUS,
        fontFamily: FONT.mono,
        fontSize: 12,
        padding: '8px 10px',
        outline: 'none',
        ...style,
      }}
    />
  );
}

/* ---------- Table / Row ---------- */

export function Table({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        background: SURFACE.panel,
        border: BORDER,
        boxShadow: SHADOW,
        fontSize: 12,
        ...style,
      }}
    >
      {children}
    </table>
  );
}

export function TH({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <th
      style={{
        fontFamily: FONT.mono,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        textAlign: 'left',
        color: PAPER,
        background: INK,
        padding: '8px 10px',
        borderBottom: BORDER_THIN,
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function TD({ children, style, accent }: {
  children: ReactNode;
  style?: CSSProperties;
  accent?: boolean;
}) {
  return (
    <td
      style={{
        color: accent ? PAPER : MUTED,
        fontFamily: FONT.mono,
        padding: '8px 10px',
        borderBottom: `1px solid ${INK}`,
        ...style,
      }}
    >
      {children}
    </td>
  );
}

/* ---------- StatusDot ---------- */

export function StatusDot({ domain = 'ok', size = 10, style }: {
  domain?: DomainKey;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        background: DOMAIN[domain],
        border: BORDER_THIN,
        borderRadius: RADIUS,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/* ---------- Metric ---------- */

export function Metric({ label, value, sub, domain = 'record' }: {
  label: string;
  value: string;
  sub?: string;
  domain?: DomainKey;
}) {
  return (
    <div
      style={{
        background: SURFACE.panel,
        border: BORDER,
        borderTop: `6px solid ${DOMAIN[domain]}`,
        boxShadow: SHADOW,
        borderRadius: RADIUS,
        padding: 14,
      }}
    >
      <div style={{ ...LABEL, color: MUTED, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 26, color: PAPER }}>
        {value}
      </div>
      {sub && (
        <div style={{ marginTop: 6, fontSize: 11, color: MUTED, fontFamily: FONT.mono }}>{sub}</div>
      )}
    </div>
  );
}

/* ---------- Empty / Loading ---------- */

export function Empty({ title, sub, action }: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        background: SURFACE.panel,
        border: BORDER_THIN,
        borderRadius: RADIUS,
        padding: '32px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: PAPER, marginBottom: 6 }}>
        {title}
      </div>
      {sub && <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>{sub}</div>}
      {action}
    </div>
  );
}

export function Loading({ variant = 'card', label, pct, style, rows = 3, height }: {
  variant?: 'card' | 'table-row' | 'stat-card' | 'list-item' | 'unit-card' | 'custom';
  label?: string;
  pct?: number;
  style?: CSSProperties;
  rows?: number;
  height?: number;
}) {
  const baseStyle: CSSProperties = {
    background: SURFACE.panel,
    border: BORDER,
    boxShadow: SHADOW,
    borderRadius: RADIUS,
    overflow: 'hidden',
    ...style,
  };

  const variants: Record<string, CSSProperties> = {
    card: { minHeight: height || 200, padding: 20 },
    'stat-card': { minHeight: height || 120, padding: 20 },
    'table-row': { minHeight: height || 56, padding: '12px 16px', display: 'flex', alignItems: 'center' },
    'list-item': { minHeight: height || 72, padding: '12px 16px' },
    'unit-card': { minHeight: height || 160, padding: 16 },
    custom: { minHeight: height || 100 },
  };

  const skeletonRows = Array.from({ length: rows }, (_, i) => (
    <div
      key={i}
      style={{
        height: variant === 'stat-card' ? (i === 0 ? 32 : 20) : 16,
        marginBottom: variant === 'stat-card' ? (i === 0 ? 12 : 8) : 8,
        borderRadius: 2,
        background: `linear-gradient(90deg, ${SURFACE.raised} 25%, ${SURFACE.input} 50%, ${SURFACE.raised} 75%)`,
        backgroundSize: '200% 100%',
        width: variant === 'table-row' ? `${60 + Math.random() * 30}%` : `${70 + Math.random() * 25}%`,
        animation: 'shimmer 1.5s linear infinite',
      }}
    />
  ));

  return (
    <div style={baseStyle}>
      {variant === 'table-row' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: '100%' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(90deg, ${SURFACE.raised} 25%, ${SURFACE.input} 50%, ${SURFACE.raised} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s linear infinite' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {skeletonRows}
          </div>
        </div>
      ) : (
        <div style={variants[variant]}>
          {skeletonRows}
        </div>
      )}
    </div>
  );
}

/* ---------- Skeleton Grid ---------- */

export function SkeletonGrid({ count = 4, variant = 'card' }: { count?: number; variant?: 'card' | 'stat-card' | 'unit-card' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <Loading key={i} variant={variant} />
      ))}
    </div>
  );
}

/* ---------- Skeleton Table ---------- */

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ background: SURFACE.panel, border: BORDER, boxShadow: SHADOW }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, padding: '12px 16px', background: SURFACE.input, borderBottom: BORDER_THIN, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED }}>
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} style={{ height: 12, background: `linear-gradient(90deg, ${SURFACE.raised} 25%, ${SURFACE.input} 50%, ${SURFACE.raised} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s linear infinite', borderRadius: 2 }} />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }, (_, i) => (
          <Loading key={i} variant="table-row" style={{ borderTop: i > 0 ? BORDER_THIN : 'none', boxShadow: 'none', border: 'none' }} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Copy to Clipboard Button ---------- */

export function Copy({ text, label = 'COPY', onCopied, style }: {
  text: string;
  label?: string;
  onCopied?: (text: string) => void;
  style?: CSSProperties;
}) {
  const [copied, setCopied] = useState(false);
  const handleClick = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onCopied?.(text);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button domain="info" size="sm" onClick={handleClick} style={style}>
      {copied ? '✓ COPIED' : label}
    </Button>
  );
}

/* ---------- Slider ---------- */

export function Slider({ value, min = 0, max = 100, step = 1, onChange, style, domain = 'spatial' }: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  style?: CSSProperties;
  domain?: DomainKey;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <div style={{ flex: 1, position: 'relative', height: 20 }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 4, transform: 'translateY(-50%)', background: SURFACE.input, border: BORDER_THIN }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, width: `${percent}%`, height: 4, transform: 'translateY(-50%)', background: DOMAIN[domain] }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 20,
            transform: 'translateY(-50%)',
            appearance: 'none',
            background: 'transparent',
            cursor: 'pointer',
            outline: 'none',
            WebkitAppearance: 'none',
          }}
        />
      </div>
      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: PAPER, minWidth: 50, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

/* Export Skeleton as alias for Loading */
export { Loading as Skeleton };