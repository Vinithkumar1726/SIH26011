import { DOMAIN, FONT, INK, MUTED, PAPER, SURFACE } from '../design/tokens';

export interface PipeStep {
  label: string;
  status: 'idle' | 'active' | 'done' | 'error';
}

const DOT: Record<PipeStep['status'], string> = {
  idle: MUTED,
  active: DOMAIN.warn,
  done: DOMAIN.ok,
  error: DOMAIN.conflict,
};

export default function PipelineStatus({ steps, stats, compact }: {
  steps: PipeStep[];
  stats?: Record<string, string>;
  compact?: boolean;
}) {
  const done = steps.filter((s) => s.status === 'done').length;
  const pct = Math.round((done / Math.max(steps.length, 1)) * 100);
  return (
    <div className="px-3 py-2" style={{ background: SURFACE.panel }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.12em', color: MUTED }}>PIPELINE</span>
        <div style={{ flex: 1, height: 12, border: `2px solid ${INK}`, background: SURFACE.input }}>
          <div style={{ height: '100%', width: `${pct}%`, background: DOMAIN.record }} />
        </div>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: PAPER, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      </div>
      {!compact && (
        <div className="flex flex-col gap-1">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                style={{
                  display: 'inline-block', width: 8, height: 8,
                  background: DOT[s.status], border: `2px solid ${INK}`,
                }}
              />
              <span style={{ fontFamily: FONT.mono, fontSize: 9, color: s.status === 'idle' ? MUTED : s.status === 'error' ? DOMAIN.conflict : PAPER }}>
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
            <span key={k} style={{ fontFamily: FONT.mono, fontSize: 9, color: MUTED }}>
              <span>{k}: </span>
              <span style={{ color: DOMAIN.record }}>{v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
