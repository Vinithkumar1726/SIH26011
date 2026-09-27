import { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import { Badge, Button, Panel, Loading, Skeleton } from '../design/primitives';
import { INK, DOMAIN, FONT, MUTED, PAPER, SURFACE } from '../design/tokens';

const VERSIONS = [
  {
    v: 'V03', date: '18 SEP 2026', user: 'SYSTEM', change: 'Geometry updated', status: 'APPROVED',
    hash: '7f3c4a91a2...', validated: true,
  },
  {
    v: 'V02', date: '12 AUG 2026', user: 'VINITH K', change: 'Floor boundary modified', status: 'APPROVED',
    hash: 'a2d8f133bc...', validated: true,
  },
  {
    v: 'V01', date: '04 JUL 2026', user: 'SYSTEM', change: 'Initial registration', status: 'ACTIVE',
    hash: 'e91c7b77f4...', validated: true,
  },
];

export default function PropertyRecords() {
  const [tab, setTab] = useState<'record' | 'history'>('record');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const spatialId = '29384756102934-B01-F01-U01-V01';

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  function copy() {
    navigator.clipboard.writeText(spatialId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
          <div className="flex items-start justify-between">
            <div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.record, marginBottom: 2 }}>
                PARCEL / B01 / F01 / U01
              </div>
              <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER, letterSpacing: '0.01em' }}>
                PROPERTY RECORD
              </h1>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
      {/* Header */}
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div className="flex items-start justify-between">
          <div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.record, marginBottom: 2 }}>
              PARCEL / B01 / F01 / U01
            </div>
            <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER, letterSpacing: '0.01em' }}>
              PROPERTY RECORD
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge domain="ok">● VALIDATED</Badge>
            <Button domain="info" style={{ fontSize: 10 }}>EXPORT</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'record', label: 'RECORD' },
            { id: 'history', label: 'VERSION HISTORY' },
          ].map((t) => (
            <Button
              key={t.id}
              domain="record"
              active={tab === t.id}
              onClick={() => setTab(t.id as 'record' | 'history')}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'record' && (
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 900 }}>
            {/* Spatial ID banner */}
            <div
              style={{
                gridColumn: '1 / -1',
                background: SURFACE.panel,
                border: `3px solid ${INK}`,
                borderTop: `6px solid ${DOMAIN.record}`,
                boxShadow: `4px 4px 0 ${INK}`,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontFamily: FONT.mono, fontSize: 9, color: DOMAIN.record, letterSpacing: '0.14em', marginBottom: 4, fontWeight: 700 }}>
                  3D SPATIAL IDENTIFIER
                </div>
                <div style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: PAPER, letterSpacing: '0.02em', userSelect: 'all' }}>
                  {spatialId}
                </div>
              </div>
              <Button domain="record" onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                <Copy size={12} />
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </Button>
            </div>

            {/* Identification */}
            <Section title="IDENTIFICATION">
              <Row label="ULPIN" value="29384756102934" mono />
              <Row label="SPATIAL ID" value="29384756102934-B01-F01-U01-V01" mono small />
              <Row label="VERSION" value="V01" mono />
              <Row label="UNIT CODE" value="U01" mono />
            </Section>

            {/* Location */}
            <Section title="LOCATION">
              <Row label="PARCEL" value="29384756102934" mono />
              <Row label="BUILDING" value="B01" mono />
              <Row label="FLOOR" value="F01 (Level 1)" mono />
              <Row label="COORDINATES" value="12.9716°N, 77.5946°E" mono />
              <Row label="CRS" value="EPSG:4326 (WGS84)" mono />
            </Section>

            {/* Geometry */}
            <Section title="GEOMETRY">
              <Row label="FOOTPRINT AREA" value="84.50 m²" mono />
              <Row label="Z MINIMUM" value="0.00 m" mono />
              <Row label="Z MAXIMUM" value="3.20 m" mono />
              <Row label="VOLUME" value="270.40 m³" mono />
              <Row label="GEOMETRY TYPE" value="POLYHEDRALSURFACEZ" mono small />
              <Row label="GEOMETRY HASH" value="7f3c4a2d...91a2" mono small />
              <Row label="GEOMETRY VERSION" value="V01" mono />
            </Section>

            {/* Validation */}
            <Section title="VALIDATION STATUS">
              {[
                { check: 'GEOMETRY', pass: true },
                { check: 'TOPOLOGY', pass: true },
                { check: 'OVERLAP', pass: true },
                { check: 'IDENTIFIER', pass: true },
              ].map((c) => (
                <div key={c.check} className="flex items-center justify-between mb-2.5">
                  <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 10, color: PAPER, letterSpacing: '0.06em' }}>
                    {c.check}
                  </span>
                  <Badge domain={c.pass ? 'ok' : 'conflict'} style={{ fontSize: 8 }}>
                    {c.pass ? '● PASS' : '▲ FAIL'}
                  </Badge>
                </div>
              ))}
              <div className="mt-3 pt-3" style={{ borderTop: `2px solid ${INK}` }}>
                <Row label="VALIDATED ON" value="18 SEP 2026 10:39:22" mono small />
                <Row label="ENGINE VERSION" value="v2.4.1" mono />
              </div>
            </Section>

            {/* Ownership placeholder */}
            <Section title="OWNERSHIP / RECORD">
              <div
                style={{
                  background: SURFACE.raised,
                  border: `2px dashed ${INK}`,
                  padding: '20px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, color: PAPER, letterSpacing: '0.1em', fontFamily: FONT.body }}>
                  OWNERSHIP INFORMATION
                </div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 6, fontFamily: FONT.body }}>
                  To be populated via land records integration
                </div>
              </div>
            </Section>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontFamily: FONT.display, fontWeight: 700, marginBottom: 16, fontSize: 13, color: PAPER, letterSpacing: '0.06em' }}>
              VERSION HISTORY
            </h3>
            <div className="relative">
              <div
                style={{
                  position: 'absolute', left: 19, top: 20, bottom: 20,
                  width: 3, background: INK,
                }}
              />
              {VERSIONS.map((v, i) => (
                <div key={v.v} className="flex gap-4 mb-6 relative">
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 40, height: 40,
                      background: i === 0 ? DOMAIN.temporal : SURFACE.raised,
                      border: `2px solid ${INK}`,
                      boxShadow: `3px 3px 0 ${INK}`,
                      fontFamily: FONT.mono, fontSize: 10,
                      color: i === 0 ? INK : PAPER,
                      fontWeight: 700, zIndex: 1,
                    }}
                  >
                    {v.v}
                  </div>
                  <div
                    style={{
                      flex: 1, background: SURFACE.panel,
                      border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`,
                      padding: '12px 14px',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 10, color: PAPER, letterSpacing: '0.04em' }}>
                        {v.change}
                      </span>
                      {i === 0 && <Badge domain="temporal">CURRENT</Badge>}
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <SmallRow label="DATE" value={v.date} />
                      <SmallRow label="ACTOR" value={v.user} />
                      <SmallRow label="STATUS" value={v.status} />
                      <SmallRow label="HASH" value={v.hash} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Panel title={title}>{children}</Panel>;
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between items-start mb-2.5" style={{ borderBottom: `1px solid ${INK}`, paddingBottom: 6 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: '0.08em', fontFamily: FONT.body, flexShrink: 0, marginRight: 8 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? FONT.mono : FONT.body,
          fontSize: small ? 9 : 10, fontWeight: 600, color: PAPER,
          textAlign: 'right', wordBreak: 'break-all', letterSpacing: small ? '0.02em' : '0.04em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SmallRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, color: MUTED, letterSpacing: '0.1em', fontFamily: FONT.body }}>{label}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 600, color: PAPER }}>{value}</div>
    </div>
  );
}
