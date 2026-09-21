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
        <div className="flex items-center gap-2" style={{ flex: 1 }}>
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
              width: 320,
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          {['ALL', 'F01', 'F02'].map((f) => (
            <button
              key={f}
              onClick={() => setFloorFilter(f)}
              style={{
                background: floorFilter === f ? '#C99A45' : 'transparent',
                border: `1px solid ${floorFilter === f ? '#C99A45' : '#28313C'}`,
                color: floorFilter === f ? '#0A0D12' : '#6E7783',
                fontSize: 9,
                padding: '3px 10px',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: 'IBM Plex Mono',
                fontWeight: floorFilter === f ? 700 : 400,
                letterSpacing: '0.06em',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="font-mono" style={{ fontSize: 9, color: '#6E7783', marginLeft: 8 }}>
          {filtered.length} RECORDS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
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
                style={{ borderBottom: '1px solid #151B23' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#10151C')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
  );
}
