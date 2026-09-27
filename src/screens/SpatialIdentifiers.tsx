import { useState, useEffect } from 'react';
import { Search, Copy } from 'lucide-react';
import { Badge, Button, Input, Panel, Table, TD, TH, Skeleton } from '../design/primitives';
import { INK, DOMAIN, FONT, MUTED, PAPER, SURFACE } from '../design/tokens';

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
  const [loading, setLoading] = useState(true);

  const filtered = ROWS.filter(
    (r) =>
      (floorFilter === 'ALL' || r.floor === floorFilter) &&
      (query === '' || r.id.includes(query) || r.entity.includes(query))
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  function copy(id: string) {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.temporal }}>
            Analysis · Identifiers
          </div>
          <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER, letterSpacing: '0.01em' }}>
            SPATIAL IDENTIFIER REGISTRY
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.temporal }}>
          Analysis · Identifiers
        </div>
        <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER, letterSpacing: '0.01em' }}>
          SPATIAL IDENTIFIER REGISTRY
        </h1>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
          Versioned 3D spatial identifiers for all registered property units.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div className="flex items-center gap-2" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={12} color={MUTED} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH IDENTIFIER..."
            style={{ fontSize: 11, letterSpacing: '0.04em' }}
          />
        </div>
        <div className="flex items-center gap-2">
          {['ALL', 'F01', 'F02'].map((f) => (
            <Button key={f} domain="temporal" active={floorFilter === f} onClick={() => setFloorFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
        <Badge domain="record">{filtered.length} RECORDS</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Panel>
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  {['SPATIAL IDENTIFIER', 'ENTITY', 'FLOOR', 'VERSION', 'STATUS', ''].map((h) => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i}>
                    <TD accent>{row.id}</TD>
                    <TD><Badge domain="record">{row.entity}</Badge></TD>
                    <TD>{row.floor}</TD>
                    <TD>{row.ver}</TD>
                    <TD><Badge domain="ok">● {row.status}</Badge></TD>
                    <TD>
                      <Button domain="info" style={{ padding: '3px 8px', fontSize: 9 }} onClick={() => copy(row.id)}>
                        <Copy size={10} style={{ display: 'inline', marginRight: 4 }} />
                        {copied === row.id ? 'COPIED' : 'COPY'}
                      </Button>
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
