import type { ReactNode } from 'react';
import { FONT, INK, PAPER, SHADOW_SM, SURFACE } from '../design/tokens';

export default function CollapsePanel({ title, extra, open, onToggle, children }: {
  title: string;
  extra?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="pointer-events-auto"
      style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: SHADOW_SM }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
        style={{
          background: 'transparent', border: 'none', borderBottom: open ? `2px solid ${INK}` : 'none',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontFamily: FONT.mono, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', color: PAPER, textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
        <span className="flex items-center gap-2">
          {extra}
          <span style={{ fontSize: 12, fontWeight: 700, color: PAPER }}>{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
