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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F4F1E8' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}>
        <div className="brutal-eyebrow">Analysis · Identifiers</div>
        <h1 className="font-display font-bold" style={{ fontSize: 18, color: '#111111', letterSpacing: '0.01em' }}>
          SPATIAL IDENTIFIER REGISTRY
        </h1>
        <p style={{ fontSize: 11, color: '#555555', marginTop: 4 }}>
          Versioned 3D spatial identifiers for all registered property units.
        </p>
      </div>

      {/* Filters */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}
      >
        <div className="input-icon" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={12} color="#555555" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH IDENTIFIER..."
            className="brutal-input font-mono"
            style={{ fontSize: 11, letterSpacing: '0.04em' }}
          />
        </div>
        <div className="flex items-center gap-0">
          {['ALL', 'F01', 'F02'].map((f) => (
            <button
              key={f}
              onClick={() => setFloorFilter(f)}
              className={`brutal-tab ${floorFilter === f ? 'active' : ''}`}
              style={{ fontFamily: 'IBM Plex Mono' }}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="brutal-badge brutal-badge-black">
          {filtered.length} RECORDS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="brutal-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container table-dark fade-up" style={{ background: 'transparent', border: 'none' }}>
        <table className="brutal-table">
          <thead style={{ position: 'sticky', top: 0, background: '#10151C', zIndex: 1 }}>
            <tr style={{ borderBottom: '1px solid #28313C' }}>
              {['SPATIAL IDENTIFIER', 'ENTITY', 'FLOOR', 'VERSION', 'STATUS', ''].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i}>
                <td className="font-mono font-bold" style={{ letterSpacing: '0.02em' }}>
                  {row.id}
                </td>
                <td><span className="brutal-badge brutal-badge-gold">{row.entity}</span></td>
                <td className="font-mono">{row.floor}</td>
                <td className="font-mono">{row.ver}</td>
                <td><span className="brutal-badge brutal-badge-green">● {row.status}</span></td>
                <td>
                  <button
                    className="brutal-btn"
                    style={{ padding: '3px 8px', fontSize: 9 }}
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
    </div>
  );
}
