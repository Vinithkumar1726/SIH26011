import { useState } from 'react';
import { Search } from 'lucide-react';

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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F4F1E8' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}>
        <div className="brutal-eyebrow">System · Immutable Log</div>
        <h1 className="font-display font-bold" style={{ fontSize: 18, color: '#111111', letterSpacing: '0.01em' }}>
          AUDIT TRAIL
        </h1>
        <p style={{ fontSize: 11, color: '#555555', marginTop: 4 }}>
          Immutable event log of all cadastral operations.
        </p>
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}
      >
        <div className="input-icon" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={12} color="#555555" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="FILTER EVENTS..."
            className="brutal-input font-mono"
            style={{ fontSize: 11, letterSpacing: '0.04em' }}
          />
        </div>
        <span className="brutal-badge brutal-badge-black">
          {filtered.length} EVENTS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="brutal-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container table-dark fade-up" style={{ background: 'transparent', border: 'none' }}>
        <table className="brutal-table">
          <thead>
            <tr>
              {['TIMESTAMP', 'ACTOR', 'ACTION', 'OBJECT', 'RESULT'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={i}>
                <td className="font-mono" style={{ whiteSpace: 'nowrap' }}>
                  {e.ts}
                </td>
                <td className="font-mono font-bold">{e.actor}</td>
                <td className="font-mono">{e.action}</td>
                <td><span className="brutal-badge brutal-badge-gold">{e.obj}</span></td>
                <td>
                  <span className={e.result === 'SUCCESS' ? 'brutal-badge brutal-badge-green' : 'brutal-badge brutal-badge-red'}>● {e.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        </div>
      </div>
    </div>
  );
}
