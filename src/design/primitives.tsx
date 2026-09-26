/**
 * Shared neo-brutalist primitives. All styling derives from `./tokens`
 * (inline styles only — no Tailwind classes, no CSS vars, no glass tokens),
 * so this file + tokens.ts are the entire 2D design system.
 */
import { useState } from 'react';
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

export function Button({ domain = 'record', active, style, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { domain?: DomainKey; active?: boolean }) {
  const [pressed, setPressed] = useState(false);
  const down = pressed || active;
  const bg = active ? DOMAIN[domain] : SURFACE.raised;
  const fg = active ? onDomain(domain) : PAPER;
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
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '8px 14px',
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

export function Loading({ label, pct }: { label: string; pct?: number }) {
  return (
    <div
      style={{
        background: SURFACE.panel,
        border: BORDER,
        boxShadow: SHADOW,
        borderRadius: RADIUS,
        padding: 16,
        maxWidth: 420,
      }}
    >
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: PAPER, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ height: 16, border: BORDER_THIN, background: SURFACE.input }}>
        <div
          style={{
            height: '100%',
            width: `${pct ?? 50}%`,
            background: `repeating-linear-gradient(-45deg, ${DOMAIN.record} 0 8px, ${INK} 8px 16px)`,
            transition: 'width 0.2s',
          }}
        />
      </div>
      {pct !== undefined && (
        <div style={{ marginTop: 6, fontFamily: FONT.mono, fontSize: 11, color: MUTED }}>{pct}%</div>
      )}
    </div>
  );
}
