import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
import { BrutalLoading } from '../components/brutal';

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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F4F1E8' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}>
        <div className="brutal-eyebrow">Analysis · Topology</div>
        <h1 className="font-display font-bold" style={{ fontSize: 18, color: '#111111', letterSpacing: '0.01em' }}>
          TOPOLOGY &amp; GEOMETRY VALIDATION
        </h1>
        <p style={{ fontSize: 11, color: '#555555', marginTop: 4 }}>
          Execute spatial validation including topology, volumetric overlap, and identifier integrity checks.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Engine status */}
        <div className={ran ? 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid gap-4 grid-cols-1'}>
          {!ran && !running && (
            <div className="brutal-panel" style={{ padding: '48px 32px', textAlign: 'center' }}>
              <ShieldCheck size={40} color="#111111" style={{ margin: '0 auto 16px' }} />
              <div className="brutal-title" style={{ fontSize: 14, marginBottom: 8 }}>
                VALIDATION ENGINE
              </div>
              <span className="brutal-badge brutal-badge-green">Ready</span>
              <div style={{ marginTop: 24 }}>
                <button className="brutal-btn brutal-btn-gold" onClick={run}>RUN VALIDATION</button>
              </div>
            </div>
          )}

          {running && (
            <div className="brutal-panel" style={{ padding: 24 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="status-led warning led-pulse" />
                <span className="font-mono font-bold" style={{ fontSize: 11, color: '#111111', letterSpacing: '0.06em' }}>
                  VALIDATION IN PROGRESS
                </span>
                <span className="font-mono ml-auto font-bold" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
              </div>
              <BrutalLoading label="" pct={progress} />
              <div className="font-mono" style={{ fontSize: 10, color: '#555555', letterSpacing: '0.04em', marginTop: 8 }}>
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
                  { label: 'CRITICAL', value: '0', tone: 'gold' as const, icon: <CheckCircle size={16} color="#111111" /> },
                  { label: 'ERRORS', value: '0', tone: 'gold' as const, icon: <CheckCircle size={16} color="#111111" /> },
                  { label: 'WARNINGS', value: '2', tone: 'warn' as const, icon: <AlertTriangle size={16} color="#B45309" /> },
                  { label: 'CHECKS PASSED', value: '18', tone: 'ok' as const, icon: <CheckCircle size={16} color="#16A34A" /> },
                ].map((m, index) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.04 }}
                    className="brutal-panel"
                    style={{ padding: '14px 16px', borderTop: `6px solid ${m.tone === 'warn' ? '#F59E0B' : m.tone === 'ok' ? '#16A34A' : '#111111'}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="brutal-eyebrow">
                        {m.label}
                      </span>
                      {m.icon}
                    </div>
                    <div className="brutal-metric-num">
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
            <div className="brutal-panel" style={{ padding: 16 }}>
              <div className="brutal-title" style={{ marginBottom: 12 }}>
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
                <div key={i} className="flex items-center gap-3 mb-2" style={{ borderBottom: '1px solid #e5e0d3', paddingBottom: 6 }}>
                  <span className="brutal-badge brutal-badge-green" style={{ fontSize: 8 }}>✓</span>
                  <span className="font-mono font-bold" style={{ fontSize: 10, color: '#111111', letterSpacing: '0.04em', flex: 1 }}>
                    {c}
                  </span>
                  <span className="font-mono" style={{ fontSize: 9, color: '#555555', fontVariantNumeric: 'tabular-nums' }}>
                    {(Math.random() * 50 + 10).toFixed(0)}ms
                  </span>
                </div>
              ))}
            </div>

            {/* Issues table */}
            <div className="brutal-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="brutal-header">
                <span className="brutal-title">Validation Issues</span>
                <span className="brutal-badge brutal-badge-gold">{ISSUES.length} FOUND</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
              <table className="brutal-table">
                <thead>
                  <tr>
                    {['SEVERITY', 'OBJECT', 'ISSUE', 'LOCATION', 'RESOLUTION'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ISSUES.map((row, i) => (
                    <tr key={i}>
                      <td><span className="brutal-badge" style={{ background: '#F59E0B' }}>{row.sev}</span></td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>{row.obj}</td>
                      <td>{row.issue}</td>
                      <td className="font-mono">{row.loc}</td>
                      <td><span className="brutal-badge">{row.res}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="brutal-btn" onClick={() => { setRan(false); setRunning(false); }}>
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
