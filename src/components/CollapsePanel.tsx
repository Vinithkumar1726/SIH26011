import type { ReactNode } from 'react';

export default function CollapsePanel({ title, extra, open, onToggle, children }: {
  title: string;
  extra?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="glass rounded-lg pointer-events-auto">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
      >
        <span className="text-[10px] font-semibold text-white uppercase tracking-wider">{title}</span>
        <span className="flex items-center gap-2">
          {extra}
          <span className="text-slate-400 text-xs">{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
