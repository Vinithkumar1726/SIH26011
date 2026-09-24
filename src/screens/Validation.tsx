import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';

const ISSUES = [
  { sev: 'WARNING', obj: 'UNIT U04', issue: 'Minor boundary precision', loc: 'BUILDING B01', res: 'REVIEW' },
  { sev: 'WARNING', obj: 'FLOOR F02', issue: 'Elevation tolerance exceeded by 0.02m', loc: 'BUILDING B01', res: 'ACCEPT' },
];

export default function Validation() {
  const [ran, setRan] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  function run() {
    setRunning(true);
    setProgress(0);
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(iv); setRunning(false); setRan(true); return 100; }
        return p + 8;
      });
    }, 120);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
        <div className="page-eyebrow">Analysis · Topology</div>
        <h1 className="font-display font-semibold" style={{ fontSize: 18, color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>
          TOPOLOGY &amp; GEOMETRY VALIDATION
        </h1>
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
          Execute spatial validation including topology, volumetric overlap, and identifier integrity checks.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Engine status */}
        <div className={ran ? 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid gap-4 grid-cols-1'}>
          {!ran && !running && (
            <div
              className="empty-state fade-up"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', padding: '48px 32px' }}
            >
              <ShieldCheck size={40} color="var(--color-border-primary)" style={{ marginBottom: 8 }} />
              <div className="empty-title" style={{ letterSpacing: '0.1em' }}>
                VALIDATION ENGINE
              </div>
              <span className="chip chip-gold">Ready</span>
              <button className="btn-accent mt-6" onClick={run}>RUN VALIDATION</button>
            </div>
          )}

          {running && (
            <div className="section fade-up" style={{ background: 'var(--color-bg-tertiary)', padding: 24 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="status-led warning led-pulse" />
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-accent)', letterSpacing: '0.06em' }}>
                  VALIDATION IN PROGRESS
                </span>
                <span className="font-mono ml-auto" style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
              </div>
              <div className="progress-bar" style={{ height: 6, marginBottom: 8 }}>
                <div className="fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--color-gold-600), var(--color-gold-300))' }} />
              </div>
              <div className="font-mono pulse-soft" style={{ fontSize: 10, color: 'var(--color-text-quaternary)', letterSpacing: '0.04em' }}>
                {progress < 30 ? 'CHECKING GEOMETRY...' :
                 progress < 50 ? 'CHECKING FLOOR LEVELS...' :
                 progress < 70 ? 'CHECKING UNIT BOUNDARIES...' :
                 progress < 85 ? 'CHECKING 3D OVERLAPS...' : 'CHECKING IDENTIFIERS...'}
              </div>
            </div>
          )}

          {ran && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
              >
                {[
                  { label: 'CRITICAL', value: '0', color: 'var(--color-accent)', icon: <CheckCircle size={16} color="var(--color-accent)" /> },
                  { label: 'ERRORS', value: '0', color: 'var(--color-accent)', icon: <CheckCircle size={16} color="var(--color-accent)" /> },
                  { label: 'WARNINGS', value: '2', color: 'var(--color-warning)', icon: <AlertTriangle size={16} color="var(--color-warning)" /> },
                  { label: 'CHECKS PASSED', value: '18', color: 'var(--color-accent)', icon: <CheckCircle size={16} color="var(--color-accent)" /> },
                ].map((m, index) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    style={{ background: 'var(--color-bg-surface)', border: `1px solid ${m.color === 'var(--color-warning)' ? 'var(--color-warning)' : 'var(--color-border-secondary)'}`, borderTop: `3px solid ${m.color}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--color-text-tertiary)', fontFamily: 'IBM Plex Sans' }}>
                        {m.label}
                      </span>
                      {m.icon}
                    </div>
                    <div className="font-display font-bold" style={{ fontSize: 28, color: m.color }}>
                      {m.value}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </div>

        {ran && (
          <>
            {/* Check log */}
            <div className="section fade-up stagger-1" style={{ background: 'var(--color-bg-tertiary)', padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--color-text-primary)', marginBottom: 12 }}>
                VALIDATION LOG
              </div>
              {[
                'CHECKING GEOMETRY',
                'CHECKING FLOOR LEVELS',
                'CHECKING UNIT BOUNDARIES',
                'CHECKING 3D OVERLAPS',
                'CHECKING IDENTIFIERS',
                'CHECKING ATTRIBUTE COMPLETENESS',
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <CheckCircle size={11} color="var(--color-accent)" />
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-accent)', letterSpacing: '0.06em', flex: 1 }}>
                    {c}
                  </span>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--color-accent)' }}>✓</span>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>
                    {(Math.random() * 50 + 10).toFixed(0)}ms
                  </span>
                </div>
              ))}
            </div>

            {/* Issues table */}
            <div className="section fade-up stagger-2" style={{ background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
              <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--color-text-primary)' }}>
                  VALIDATION ISSUES
                </span>
                <span className="chip chip-gold">{ISSUES.length} FOUND</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                    {['SEVERITY', 'OBJECT', 'ISSUE', 'LOCATION', 'RESOLUTION'].map((h) => (
                      <th key={h} className="text-left px-4 py-2" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em', fontWeight: 600 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ISSUES.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < ISSUES.length - 1 ? '1px solid var(--color-navy-800)' : undefined }}>
                      <td className="px-4 py-3"><span className="tag-warning">{row.sev}</span></td>
                      <td className="px-4 py-3 font-mono" style={{ fontSize: 10, color: 'var(--color-text-primary)' }}>{row.obj}</td>
                      <td className="px-4 py-3" style={{ fontSize: 10, color: 'var(--color-text-quaternary)' }}>{row.issue}</td>
                      <td className="px-4 py-3 font-mono" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{row.loc}</td>
                      <td className="px-4 py-3"><span className="tag-warning">{row.res}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => { setRan(false); setRunning(false); }}>
                <RotateCcw size={11} style={{ display: 'inline', marginRight: 4 }} />
                RE-RUN
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RotateCcw({ size, style }: any) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
}
