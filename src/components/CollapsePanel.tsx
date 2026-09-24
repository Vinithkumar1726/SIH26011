import type { ReactNode } from 'react';

export default function CollapsePanel({ title, extra, open, onToggle, children }: {
  title: string;
  extra?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="pointer-events-auto" style={{ background: '#111111', border: '2px solid #000000', boxShadow: '4px 4px 0 rgba(0,0,0,0.55)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
        style={{ borderBottom: open ? '2px solid #F5C400' : 'none' }}
      >
        <span className="text-[10px] font-bold text-white uppercase" style={{ letterSpacing: '0.12em' }}>{title}</span>
        <span className="flex items-center gap-2">
          {extra}
          <span className="text-xs font-bold" style={{ color: '#F5C400' }}>{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
