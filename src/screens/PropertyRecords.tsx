import { useState } from 'react';
import { Copy } from 'lucide-react';

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

  const spatialId = '29384756102934-B01-F01-U01-V01';

  function copy() {
    navigator.clipboard.writeText(spatialId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F4F1E8' }}>
      {/* Header */}
      <div
        className="px-6 py-4 shrink-0"
        style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="brutal-eyebrow" style={{ marginBottom: 2 }}>
              PARCEL / B01 / F01 / U01
            </div>
            <h1 className="font-display font-bold" style={{ fontSize: 18, color: '#111111', letterSpacing: '0.01em' }}>
              PROPERTY RECORD
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="brutal-badge brutal-badge-green" style={{ fontSize: 10, padding: '4px 10px' }}>● VALIDATED</span>
            <button className="brutal-btn" style={{ fontSize: 10 }}>EXPORT</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="brutal-tabs mt-4">
          {[
            { id: 'record', label: 'RECORD' },
            { id: 'history', label: 'VERSION HISTORY' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`brutal-tab ${tab === t.id ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'record' && (
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 900 }}>
            {/* Spatial ID banner */}
            <div
              className="fade-up"
              style={{
                gridColumn: '1 / -1',
                background: '#111111',
                border: '3px solid #000000',
                boxShadow: '5px 5px 0 rgba(17,17,17,0.3)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 9, color: '#F5C400', letterSpacing: '0.14em', marginBottom: 4, fontFamily: 'IBM Plex Sans', fontWeight: 700 }}>
                  3D SPATIAL IDENTIFIER
                </div>
                <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em', userSelect: 'all' }}>
                  {spatialId}
                </div>
              </div>
              <button className="brutal-btn brutal-btn-gold" onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                <Copy size={12} />
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
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
                  <span className="font-mono font-bold" style={{ fontSize: 10, color: '#111111', letterSpacing: '0.06em' }}>
                    {c.check}
                  </span>
                  <span className="brutal-badge brutal-badge-green" style={{ fontSize: 8 }}>● PASS</span>
                </div>
              ))}
              <div className="mt-3 pt-3" style={{ borderTop: '2px solid #111111' }}>
                <Row label="VALIDATED ON" value="18 SEP 2026 10:39:22" mono small />
                <Row label="ENGINE VERSION" value="v2.4.1" mono />
              </div>
            </Section>

            {/* Ownership placeholder */}
            <Section title="OWNERSHIP / RECORD">
              <div
                style={{
                  background: '#F4F1E8',
                  border: '2px dashed #111111',
                  padding: '20px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, color: '#111111', letterSpacing: '0.1em', fontFamily: 'IBM Plex Sans' }}>
                  OWNERSHIP INFORMATION
                </div>
                <div style={{ fontSize: 10, color: '#555555', marginTop: 6, fontFamily: 'IBM Plex Sans' }}>
                  To be populated via land records integration
                </div>
              </div>
            </Section>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ maxWidth: 600 }}>
            <h3 className="font-display font-bold mb-4" style={{ fontSize: 13, color: '#111111', letterSpacing: '0.06em' }}>
              VERSION HISTORY
            </h3>
            <div className="relative">
              <div
                style={{
                  position: 'absolute',
                  left: 19,
                  top: 20,
                  bottom: 20,
                  width: 3,
                  background: '#111111',
                }}
              />
              {VERSIONS.map((v, i) => (
                <div key={v.v} className="flex gap-4 mb-6 relative">
                  <div
                    className="font-mono flex items-center justify-center shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      background: i === 0 ? '#F5C400' : '#FFFFFF',
                      border: '2px solid #111111',
                      boxShadow: '3px 3px 0 #111111',
                      fontSize: 10,
                      color: '#111111',
                      fontWeight: 700,
                      zIndex: 1,
                    }}
                  >
                    {v.v}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: '#FFFFFF',
                      border: '2px solid #111111',
                      boxShadow: '4px 4px 0 #111111',
                      padding: '12px 14px',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold" style={{ fontSize: 10, color: '#111111', letterSpacing: '0.04em' }}>
                        {v.change}
                      </span>
                      {i === 0 && <span className="brutal-badge brutal-badge-gold">CURRENT</span>}
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
  return (
    <div className="brutal-panel" style={{ padding: 16 }}>
      <div
        className="brutal-title"
        style={{ marginBottom: 12, borderBottom: '2px solid #111111', paddingBottom: 8 }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between items-start mb-2.5" style={{ borderBottom: '1px solid rgba(17,17,17,0.12)', paddingBottom: 6 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#555555', letterSpacing: '0.08em', fontFamily: 'IBM Plex Sans', flexShrink: 0, marginRight: 8 }}>
        {label}
      </span>
      <span
        className={mono ? 'font-mono' : ''}
        style={{ fontSize: small ? 9 : 10, fontWeight: 600, color: '#111111', textAlign: 'right', wordBreak: 'break-all', letterSpacing: small ? '0.02em' : '0.04em' }}
      >
        {value}
      </span>
    </div>
  );
}

function SmallRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, color: '#555555', letterSpacing: '0.1em', fontFamily: 'IBM Plex Sans' }}>{label}</div>
      <div className="font-mono" style={{ fontSize: 9, fontWeight: 600, color: '#111111' }}>{value}</div>
    </div>
  );
}
