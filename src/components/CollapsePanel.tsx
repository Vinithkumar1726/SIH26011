import type { ReactNode } from 'react';

export default function CollapsePanel({ title, extra, open, onToggle, children, tone = 'dark' }: {
  title: string;
  extra?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  tone?: 'dark' | 'glass';
}) {
  const glass = tone === 'glass';
  return (
    <div
      className={`pointer-events-auto ${glass ? 'rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/10' : ''}`}
      style={glass
        ? { boxShadow: '0 10px 30px -12px rgb(0 0 0 / 0.55)' }
        : { background: '#111111', border: '2px solid #000000', boxShadow: '4px 4px 0 rgba(0,0,0,0.55)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
        style={glass ? {} : { borderBottom: open ? '2px solid #F5C400' : 'none' }}
      >
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${glass ? 'text-slate-200' : 'text-white'}`}>{title}</span>
        <span className="flex items-center gap-2">
          {extra}
          <span className={`text-xs ${glass ? 'text-cyan-300' : 'font-bold'}`} style={glass ? {} : { color: '#F5C400' }}>{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
