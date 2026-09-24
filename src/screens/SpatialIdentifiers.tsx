import { useState } from 'react';
import { Search, Copy } from 'lucide-react';

const ROWS = [
  { id: '29384756102934-B01-F01-U01-V01', entity: 'U01', ver: 'V01', status: 'ACTIVE', floor: 'F01' },
  { id: '29384756102934-B01-F01-U02-V01', entity: 'U02', ver: 'V01', status: 'ACTIVE', floor: 'F01' },
  { id: '29384756102934-B01-F02-U03-V01', entity: 'U03', ver: 'V01', status: 'ACTIVE', floor: 'F02' },
  { id: '29384756102934-B01-F02-U04-V01', entity: 'U04', ver: 'V01', status: 'ACTIVE', floor: 'F02' },
];

export default function SpatialIdentifiers() {
  const [query, setQuery] = useState('');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = ROWS.filter(
    (r) =>
      (floorFilter === 'ALL' || r.floor === floorFilter) &&
      (query === '' || r.id.includes(query) || r.entity.includes(query))
  );

  function copy(id: string) {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0A0D12' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #28313C' }}>
        <div className="font-mono text-[10px] tracking-[0.2em] text-amber-300/70 mb-1">ANALYSIS · IDENTIFIERS</div>
        <h1 className="font-display font-semibold" style={{ fontSize: 18, color: '#F1F3F5', letterSpacing: '0.04em' }}>
          SPATIAL IDENTIFIER REGISTRY
        </h1>
        <p style={{ fontSize: 11, color: '#6E7783', marginTop: 4 }}>
          Versioned 3D spatial identifiers for all registered property units.
        </p>
      </div>

      {/* Filters */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid #28313C', background: '#10151C' }}
      >
        <div className="input-icon" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={12} color="#6E7783" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH IDENTIFIER..."
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
        <div className="flex items-center gap-1">
          {['ALL', 'F01', 'F02'].map((f) => (
            <button
              key={f}
              onClick={() => setFloorFilter(f)}
              className={`chip transition-all ${floorFilter === f ? 'chip-gold' : ''}`}
              style={{
                cursor: 'pointer',
                background: floorFilter === f ? undefined : 'transparent',
                borderColor: floorFilter === f ? undefined : '#28313C',
                color: floorFilter === f ? undefined : '#6E7783',
                fontFamily: 'IBM Plex Mono',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="chip" style={{ background: 'transparent', marginLeft: 8 }}>
          {filtered.length} RECORDS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="table-container table-dark fade-up" style={{ background: 'transparent', borderColor: '#28313C' }}>
        <table className="w-full">
          <thead style={{ position: 'sticky', top: 0, background: '#10151C', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid #28313C' }}>
              {['SPATIAL IDENTIFIER', 'ENTITY', 'FLOOR', 'VERSION', 'STATUS', ''].map((h) => (
                <th key={h} className="text-left px-5 py-2" style={{ fontSize: 9, color: '#6E7783', letterSpacing: '0.1em', fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={i}
                className="fade-up"
                style={{ borderBottom: '1px solid #151B23', animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <td className="px-5 py-3 font-mono" style={{ fontSize: 10, color: '#4FB8AC', letterSpacing: '0.02em' }}>
                  {row.id}
                </td>
                <td className="px-5 py-3 font-mono" style={{ fontSize: 11, color: '#C99A45', fontWeight: 600 }}>{row.entity}</td>
                <td className="px-5 py-3 font-mono" style={{ fontSize: 10, color: '#A8B0BA' }}>{row.floor}</td>
                <td className="px-5 py-3 font-mono" style={{ fontSize: 10, color: '#6E7783' }}>{row.ver}</td>
                <td className="px-5 py-3"><span className="tag-valid">{row.status}</span></td>
                <td className="px-5 py-3">
                  <button
                    className="btn-ghost"
                    style={{ padding: '3px 8px', fontSize: 9, color: copied === row.id ? '#4FB8AC' : '#6E7783' }}
                    onClick={() => copy(row.id)}
                  >
                    <Copy size={10} style={{ display: 'inline', marginRight: 4 }} />
                    {copied === row.id ? 'COPIED' : 'COPY'}
                  </button>
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
