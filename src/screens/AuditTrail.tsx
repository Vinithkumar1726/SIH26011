import { useState } from 'react';
import { Search } from 'lucide-react';
import { Badge, Input, Panel, Table, TD, TH } from '../design/primitives';
import { INK, DOMAIN, FONT, PAPER, SURFACE, MUTED } from '../design/tokens';

const EVENTS = [
  { ts: '18 SEP 2026 10:42:31', actor: 'SYSTEM', action: '3D RECORD GENERATED', obj: 'U01', result: 'SUCCESS' },
  { ts: '18 SEP 2026 10:42:29', actor: 'SYSTEM', action: '3D RECORD GENERATED', obj: 'U02', result: 'SUCCESS' },
  { ts: '18 SEP 2026 10:42:27', actor: 'SYSTEM', action: '3D RECORD GENERATED', obj: 'U03', result: 'SUCCESS' },
  { ts: '18 SEP 2026 10:42:25', actor: 'SYSTEM', action: '3D RECORD GENERATED', obj: 'U04', result: 'SUCCESS' },
  { ts: '18 SEP 2026 10:39:22', actor: 'SYSTEM', action: 'TOPOLOGY VALIDATION PASSED', obj: 'B01', result: 'SUCCESS' },
  { ts: '18 SEP 2026 10:38:01', actor: 'VINITH K', action: 'AI PROPOSALS REVIEWED', obj: 'SESSION', result: 'SUCCESS' },
  { ts: '18 SEP 2026 10:31:44', actor: 'SYSTEM', action: 'DATA IMPORT COMPLETED', obj: 'SESSION', result: 'SUCCESS' },
  { ts: '18 SEP 2026 10:28:00', actor: 'VINITH K', action: 'SESSION STARTED', obj: 'WORKSPACE', result: 'SUCCESS' },
  { ts: '12 AUG 2026 14:22:10', actor: 'VINITH K', action: 'GEOMETRY UPDATED', obj: 'U01', result: 'SUCCESS' },
  { ts: '04 JUL 2026 09:11:55', actor: 'SYSTEM', action: 'INITIAL REGISTRATION', obj: 'PARCEL', result: 'SUCCESS' },
];

export default function AuditTrail() {
  const [query, setQuery] = useState('');

  const filtered = EVENTS.filter(
    (e) =>
      query === '' ||
      e.action.includes(query.toUpperCase()) ||
      e.obj.includes(query.toUpperCase()) ||
      e.actor.includes(query.toUpperCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.temporal }}>
          System · Immutable Log
        </div>
        <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER, letterSpacing: '0.01em' }}>
          AUDIT TRAIL
        </h1>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
          Immutable event log of all cadastral operations.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div className="flex items-center gap-2" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={12} color={MUTED} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="FILTER EVENTS..."
            style={{ fontSize: 11, letterSpacing: '0.04em' }}
          />
        </div>
        <Badge domain="record">{filtered.length} EVENTS</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Panel>
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <thead>
                <tr>
                  {['TIMESTAMP', 'ACTOR', 'ACTION', 'OBJECT', 'RESULT'].map((h) => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={i}>
                    <TD style={{ whiteSpace: 'nowrap' }}>{e.ts}</TD>
                    <TD accent>{e.actor}</TD>
                    <TD>{e.action}</TD>
                    <TD><Badge domain="record">{e.obj}</Badge></TD>
                    <TD>
                      <Badge domain={e.result === 'SUCCESS' ? 'ok' : 'conflict'}>● {e.result}</Badge>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
