import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { Badge, Button, Loading, Metric, Panel, StatusDot, Table, TD, TH } from '../design/primitives';
import { INK, DOMAIN, FONT, MUTED, PAPER, SURFACE } from '../design/tokens';

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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.ok }}>
          Analysis · Topology
        </div>
        <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER, letterSpacing: '0.01em' }}>
          TOPOLOGY &amp; GEOMETRY VALIDATION
        </h1>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
          Execute spatial validation including topology, volumetric overlap, and identifier integrity checks.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Engine status */}
        <div className={ran ? 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid gap-4 grid-cols-1'}>
          {!ran && !running && (
            <Panel eyebrow="VALIDATION ENGINE" title="READY TO RUN" accent="ok">
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <ShieldCheck size={40} color={PAPER} style={{ margin: '0 auto 16px' }} />
                <div>
                  <Badge domain="ok">Ready</Badge>
                </div>
                <div style={{ marginTop: 24 }}>
                  <Button domain="ok" onClick={run}>RUN VALIDATION</Button>
                </div>
              </div>
            </Panel>
          )}

          {running && (
            <Panel eyebrow="VALIDATION IN PROGRESS" title={`${progress}%`} accent="warn"
              right={<StatusDot domain="warn" size={10} />}>
              <Loading label="" pct={progress} />
              <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, letterSpacing: '0.04em', marginTop: 8 }}>
                {progress < 30 ? 'CHECKING GEOMETRY...' :
                 progress < 50 ? 'CHECKING FLOOR LEVELS...' :
                 progress < 70 ? 'CHECKING UNIT BOUNDARIES...' :
                 progress < 85 ? 'CHECKING 3D OVERLAPS...' : 'CHECKING IDENTIFIERS...'}
              </div>
            </Panel>
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
                  { label: 'CRITICAL', value: '0', domain: 'ok' as const, icon: <CheckCircle size={16} color={DOMAIN.ok} /> },
                  { label: 'ERRORS', value: '0', domain: 'ok' as const, icon: <CheckCircle size={16} color={DOMAIN.ok} /> },
                  { label: 'WARNINGS', value: '2', domain: 'warn' as const, icon: <AlertTriangle size={16} color={DOMAIN.warn} /> },
                  { label: 'CHECKS PASSED', value: '18', domain: 'ok' as const, icon: <CheckCircle size={16} color={DOMAIN.ok} /> },
                ].map((m, index) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.04 }}
                  >
                    <Metric label={m.label} value={m.value} domain={m.domain} />
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </div>

        {ran && (
          <>
            {/* Check log */}
            <Panel title="VALIDATION LOG" accent="ok">
              {[
                'CHECKING GEOMETRY',
                'CHECKING FLOOR LEVELS',
                'CHECKING UNIT BOUNDARIES',
                'CHECKING 3D OVERLAPS',
                'CHECKING IDENTIFIERS',
                'CHECKING ATTRIBUTE COMPLETENESS',
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 mb-2" style={{ borderBottom: `1px solid ${INK}`, paddingBottom: 6 }}>
                  <Badge domain="ok" style={{ fontSize: 8 }}>✓</Badge>
                  <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 10, color: PAPER, letterSpacing: '0.04em', flex: 1 }}>
                    {c}
                  </span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
                    {(Math.random() * 50 + 10).toFixed(0)}ms
                  </span>
                </div>
              ))}
            </Panel>

            {/* Issues table */}
            <Panel title="Validation Issues" accent="warn"
              right={<Badge domain="warn">{ISSUES.length} FOUND</Badge>}>
              <div style={{ overflowX: 'auto' }}>
                <Table>
                  <thead>
                    <tr>
                      {['SEVERITY', 'OBJECT', 'ISSUE', 'LOCATION', 'RESOLUTION'].map((h) => (
                        <TH key={h}>{h}</TH>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ISSUES.map((row, i) => (
                      <tr key={i}>
                        <TD><Badge domain="warn">{row.sev}</Badge></TD>
                        <TD accent>{row.obj}</TD>
                        <TD>{row.issue}</TD>
                        <TD>{row.loc}</TD>
                        <TD><Badge domain="info">{row.res}</Badge></TD>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Panel>

            <div className="flex gap-3">
              <Button domain="info" onClick={() => { setRan(false); setRunning(false); }}>
                <RotateCcw size={11} style={{ display: 'inline', marginRight: 4 }} />
                RE-RUN
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
