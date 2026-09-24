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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0A0D12' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #28313C' }}>
        <div className="font-mono text-[10px] tracking-[0.2em] text-amber-300/70 mb-1">SYSTEM · IMMUTABLE LOG</div>
        <h1 className="font-display font-semibold" style={{ fontSize: 18, color: '#F1F3F5', letterSpacing: '0.04em' }}>
          AUDIT TRAIL
        </h1>
        <p style={{ fontSize: 11, color: '#6E7783', marginTop: 4 }}>
          Immutable event log of all cadastral operations.
        </p>
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid #28313C', background: '#10151C' }}
      >
        <div className="input-icon" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={12} color="#6E7783" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="FILTER EVENTS..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'IBM Plex Mono',
              fontSize: 11,
              color: '#F1F3F5',
              letterSpacing: '0.04em',
            }}
          />
        </div>
        <span className="chip" style={{ background: 'transparent' }}>
          {filtered.length} EVENTS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="table-container table-dark fade-up" style={{ background: 'transparent', borderColor: '#28313C' }}>
        <table className="w-full">
          <thead style={{ position: 'sticky', top: 0, background: '#10151C', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid #28313C' }}>
              {['TIMESTAMP', 'ACTOR', 'ACTION', 'OBJECT', 'RESULT'].map((h) => (
                <th key={h} className="text-left px-5 py-2" style={{ fontSize: 9, color: '#6E7783', letterSpacing: '0.1em', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr
                key={i}
                className="fade-up"
                style={{ borderBottom: '1px solid #151B23', animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <td className="px-5 py-3 font-mono" style={{ fontSize: 9, color: '#6E7783', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  {e.ts}
                </td>
                <td className="px-5 py-3 font-mono" style={{ fontSize: 10, color: '#A8B0BA' }}>{e.actor}</td>
                <td className="px-5 py-3 font-mono" style={{ fontSize: 10, color: '#F1F3F5', letterSpacing: '0.02em' }}>{e.action}</td>
                <td className="px-5 py-3 font-mono" style={{ fontSize: 10, color: '#C99A45' }}>{e.obj}</td>
                <td className="px-5 py-3">
                  <span className={e.result === 'SUCCESS' ? 'tag-valid' : 'tag-error'}>{e.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
