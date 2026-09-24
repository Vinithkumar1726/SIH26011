export interface PipeStep {
  label: string;
  status: 'idle' | 'active' | 'done' | 'error';
}

const DOT: Record<PipeStep['status'], string> = {
  idle: '#3a4356',
  active: '#C99A45',
  done: '#4FB8AC',
  error: '#E5484D',
};

export default function PipelineStatus({ steps, stats, compact }: {
  steps: PipeStep[];
  stats?: Record<string, string>;
  compact?: boolean;
}) {
  const done = steps.filter((s) => s.status === 'done').length;
  const pct = Math.round((done / Math.max(steps.length, 1)) * 100);
  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-[9px] tracking-[0.12em] text-slate-400">PIPELINE</span>
        <div className="progress-bar" style={{ flex: 1 }}>
          <div className="fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--color-gold-600), var(--color-gold-300))' }} />
        </div>
        <span className="font-mono text-[9px] text-slate-300" style={{ fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      </div>
      {!compact && (
        <div className="flex flex-col gap-1">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className={`inline-block rounded-full ${s.status === 'active' ? 'led-pulse' : ''}`}
                style={{ width: 7, height: 7, background: DOT[s.status], boxShadow: s.status === 'done' ? `0 0 5px ${DOT[s.status]}` : 'none' }}
              />
              <span className="font-mono text-[9px]" style={{ color: s.status === 'idle' ? '#5b6478' : s.status === 'error' ? '#E5484D' : '#cbd5e1' }}>
                {s.status === 'done' ? '✓ ' : s.status === 'error' ? '✗ ' : s.status === 'active' ? '… ' : '· '}
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}
      {stats && Object.keys(stats).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
          {Object.entries(stats).map(([k, v]) => (
            <span key={k} className="font-mono text-[9px] text-slate-400">
              <span className="text-slate-500">{k}: </span>
              <span className="text-amber-200/90">{v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
