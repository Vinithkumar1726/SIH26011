import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'default' | 'primary' | 'gold' | 'danger' | 'success';

export function BrutalButton({ tone = 'default', className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  const t = tone === 'primary' ? 'brutal-btn-primary'
    : tone === 'gold' ? 'brutal-btn-gold'
    : tone === 'danger' ? 'brutal-btn-danger'
    : tone === 'success' ? 'brutal-btn-success' : '';
  return <button className={`brutal-btn ${t} ${className}`} {...rest} />;
}

export function BrutalBadge({ tone = 'default', children, dot }: {
  tone?: 'default' | 'gold' | 'black' | 'green' | 'red' | 'blue';
  children: ReactNode; dot?: string;
}) {
  const t = tone === 'default' ? '' : `brutal-badge-${tone}`;
  return (
    <span className={`brutal-badge ${t}`}>
      {dot && <span style={{ width: 7, height: 7, background: dot, border: '1px solid #111' }} />}
      {children}
    </span>
  );
}

export function BrutalPanel({ title, eyebrow, right, children, dark, flat }: {
  title?: string; eyebrow?: string; right?: ReactNode; children: ReactNode;
  dark?: boolean; flat?: boolean;
}) {
  return (
    <section className={dark ? 'brutal-panel-dark' : flat ? 'brutal-panel-flat' : 'brutal-panel'}>
      {(title || eyebrow || right) && (
        <header className="brutal-header">
          <div>
            {eyebrow && <div className="brutal-eyebrow" style={{ color: 'inherit', opacity: 0.7 }}>{eyebrow}</div>}
            {title && <div className="brutal-title">{title}</div>}
          </div>
          {right}
        </header>
      )}
      <div style={{ padding: 14 }}>{children}</div>
    </section>
  );
}

export function BrutalMetric({ label, value, sub, tone }: {
  label: string; value: string; sub?: string;
  tone?: 'gold' | 'green' | 'red' | 'blue';
}) {
  const bar = tone === 'gold' ? 'var(--brutal-gold)' : tone === 'green' ? 'var(--brutal-success)'
    : tone === 'red' ? 'var(--brutal-error)' : tone === 'blue' ? 'var(--brutal-info)' : 'var(--brutal-ink)';
  return (
    <div className="brutal-panel" style={{ padding: 14, borderTop: `6px solid ${bar}` }}>
      <div className="brutal-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div className="brutal-metric-num">{value}</div>
      {sub && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--brutal-muted)', fontFamily: 'var(--brutal-font-mono)' }}>{sub}</div>}
    </div>
  );
}

export function BrutalEmpty({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="brutal-panel-flat" style={{ padding: '32px 20px', textAlign: 'center' }}>
      <div className="brutal-title" style={{ marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--brutal-muted)', marginBottom: 12 }}>{sub}</div>}
      {action}
    </div>
  );
}

export function BrutalLoading({ label, pct }: { label: string; pct?: number }) {
  return (
    <div className="brutal-panel" style={{ padding: 16, maxWidth: 420 }}>
      <div className="brutal-title" style={{ marginBottom: 10 }}>{label}</div>
      <div style={{ height: 16, border: '2px solid #111', background: '#fff' }}>
        <div style={{ height: '100%', width: `${pct ?? 50}%`, background: 'repeating-linear-gradient(-45deg, var(--brutal-gold) 0 8px, var(--brutal-ink) 8px 16px)', transition: 'width 0.2s' }} />
      </div>
      {pct !== undefined && (
        <div style={{ marginTop: 6, fontFamily: 'var(--brutal-font-mono)', fontSize: 11 }}>{pct}%</div>
      )}
    </div>
  );
}
