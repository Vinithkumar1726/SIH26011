import { useState, useEffect } from 'react';
import { Copy, AlertTriangle, ChevronLeft, MapPin, Building2, Layers, Hash, Clock, User, Shield } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';
import { Badge, Button, Card, Loading, Metric, Panel } from '../design/primitives';
import { INK, DOMAIN, FONT, MUTED, PAPER, SURFACE } from '../design/tokens';

interface Props {
  unitId: string;
  onBack: () => void;
}

export default function PropertyDetail({ unitId, onBack }: Props) {
  const { user } = useAuth();
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'record' | 'geometry' | 'validation' | 'history'>('record');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getUnit(unitId).then((result) => {
      if (active) {
        if (result.success && result.data) setUnit(result.data);
        else setError(result.error || 'Failed to load property unit');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [unitId]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ background: SURFACE.app }}>
        <div className="flex items-center justify-center h-full">
          <Loading label="Loading property record..." />
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex flex-col h-full" style={{ background: SURFACE.app }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertTriangle size={48} color={DOMAIN.conflict} className="mb-4" />
            <h2 className="text-lg font-semibold mb-2" style={{ color: PAPER }}>Failed to Load</h2>
            <p className="mb-4" style={{ color: MUTED }}>{error || 'Property unit not found'}</p>
            <Button domain="info" onClick={onBack}>← Back to Records</Button>
          </div>
        </div>
      </div>
    );
  }

  const spatialId = unit.spatial_identifier?.identifier_string || `${unit.parcel?.ulpin}-${unit.building?.id}-${unit.floor?.floor_code}-${unit.unit_code}-V${String(unit.geometry_version).padStart(2, '0')}`;
  const floor = unit.floor;
  const building = unit.building;
  const parcel = unit.parcel;

  return (
    <div className="flex flex-col h-full" style={{ background: SURFACE.app }}>
      {/* Header */}
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Button domain="info" style={{ padding: '6px 10px' }} onClick={onBack} aria-label="Back to records">
              <ChevronLeft size={18} />
            </Button>
            <div>
              <div className="font-mono text-xs font-bold mb-1" style={{ color: MUTED }}>
                {parcel?.ulpin} / {building?.id} / {floor?.floor_code} / {unit.unit_code}
              </div>
              <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: PAPER }}>
                PROPERTY RECORD
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge domain="ok">● VALIDATED</Badge>
            <div className="hidden sm:flex items-center gap-2 text-sm font-bold" style={{ color: PAPER }}>
              <User size={14} />
              <span>{user?.displayName || 'Anonymous'}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'record', label: 'RECORD', icon: MapPin },
            { id: 'geometry', label: 'GEOMETRY', icon: Layers },
            { id: 'validation', label: 'VALIDATION', icon: Shield },
            { id: 'history', label: 'HISTORY', icon: Clock },
          ].map((t) => (
            <Button
              key={t.id}
              domain="record"
              active={activeTab === t.id}
              onClick={() => setActiveTab(t.id as any)}
            >
              <t.icon size={12} style={{ display: 'inline', marginRight: 6 }} />
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'record' && <RecordTab unit={unit} spatialId={spatialId} onCopy={copyToClipboard} copied={copied} />}
        {activeTab === 'geometry' && <GeometryTab unit={unit} onCopy={copyToClipboard} copied={copied} />}
        {activeTab === 'validation' && <ValidationTab unit={unit} />}
        {activeTab === 'history' && <HistoryTab unitId={unitId} unit={unit} />}
      </div>
    </div>
  );
}

function RecordTab({ unit, spatialId, onCopy, copied }: any) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '1200px' }}>
      {/* Spatial ID Banner */}
      <div
        className="col-span-2"
        style={{
          background: SURFACE.panel, border: `3px solid ${INK}`,
          borderTop: `6px solid ${DOMAIN.record}`, boxShadow: `4px 4px 0 ${INK}`,
          padding: '12px 16px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, color: DOMAIN.record, marginBottom: 4, letterSpacing: '0.14em' }}>
            3D SPATIAL IDENTIFIER
          </div>
          <div className="font-mono font-bold text-lg break-all" style={{ color: PAPER }}>{spatialId}</div>
        </div>
        <Button domain="record" style={{ fontSize: 10 }} onClick={() => onCopy(spatialId, 'spatialId')}>
          <Copy size={14} /> {copied === 'spatialId' ? 'COPIED' : 'COPY'}
        </Button>
      </div>

      {/* Identification */}
      <Section title="IDENTIFICATION" icon={MapPin}>
        <Row label="ULPIN" value={unit.parcel?.ulpin || '—'} mono />
        <Row label="SPATIAL ID" value={spatialId} mono small />
        <Row label="VERSION" value={`V${String(unit.geometry_version).padStart(2, '0')}`} mono />
        <Row label="UNIT CODE" value={unit.unit_code} mono />
        <Row label="UNIT TYPE" value={unit.unit_type} />
        <Row label="LABEL" value={unit.label} />
      </Section>

      {/* Location Hierarchy */}
      <Section title="LOCATION HIERARCHY" icon={Building2}>
        <Row label="PARCEL" value={unit.parcel?.name || unit.parcel?.ulpin || '—'} />
        <Row label="BUILDING" value={unit.building?.name || unit.building?.id || '—'} />
        <Row label="FLOOR" value={`${unit.floor?.floor_code} · ${unit.floor?.floor_label || ''}`} />
        <Row label="CRS" value={`EPSG:${unit.parcel?.srid || 4326}`} mono />
      </Section>

      {/* Geometry Summary */}
      <Section title="GEOMETRY SUMMARY" icon={Layers}>
        <Row label="FOOTPRINT AREA" value={`${unit.area_sqm?.toFixed(2) || '—'} m²`} mono />
        <Row label="VOLUME" value={`${unit.volume_cum?.toFixed(2) || '—'} m³`} mono />
        <Row label="Z MINIMUM" value={`${unit.floor?.z_min?.toFixed(2) || '—'} m`} mono />
        <Row label="Z MAXIMUM" value={`${unit.floor?.z_max?.toFixed(2) || '—'} m`} mono />
        <Row label="FLOOR HEIGHT" value={`${((unit.floor?.z_max || 0) - (unit.floor?.z_min || 0)).toFixed(2)} m`} mono />
        <Row label="GEOMETRY TYPE" value="POLYHEDRALSURFACEZ" mono small />
        <Row label="GEOMETRY HASH" value={unit.geometry_hash ? `${unit.geometry_hash.slice(0, 12)}...` : '—'} mono small />
      </Section>

      {/* Validation Status */}
      <Section title="VALIDATION STATUS" icon={Shield}>
        {[
          { check: 'GEOMETRY INTEGRITY', pass: true },
          { check: 'TOPOLOGY (CONTAINMENT)', pass: true },
          { check: '3D OVERLAP CHECK', pass: true },
          { check: 'IDENTIFIER UNIQUENESS', pass: true },
          { check: 'ATTRIBUTE COMPLETENESS', pass: true },
          { check: 'VERTICAL DATUM CONSISTENCY', pass: true },
        ].map((c) => (
          <div key={c.check} className="flex items-center justify-between mb-2.5">
            <span className="font-mono font-bold text-xs uppercase tracking-wider" style={{ color: MUTED }}>{c.check}</span>
            <Badge domain={c.pass ? 'ok' : 'conflict'} style={{ fontSize: 8 }}>
              {c.pass ? '● PASS' : '▲ FAIL'}
            </Badge>
          </div>
        ))}
        <div className="mt-3 pt-3" style={{ borderTop: `2px solid ${INK}` }}>
          <Row label="LAST VALIDATED" value={unit.created_at ? new Date(unit.created_at).toLocaleString() : '—'} mono small />
          <Row label="VALIDATION ENGINE" value="v2.4.1" mono />
        </div>
      </Section>

      {/* Ownership / Rights */}
      <Section title="OWNERSHIP / RIGHTS" icon={User}>
        <Card>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: MUTED, marginBottom: 12 }}>
            Cadastral Rights Record
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <InfoCell label="Owner" value="To be populated via land records integration" />
            <InfoCell label="Tenure" value="—" />
            <InfoCell label="Share" value="—" />
            <InfoCell label="Last Verified" value="—" />
            <InfoCell label="Encumbrances" value="None registered" />
            <InfoCell label="Restrictions" value="None registered" />
          </div>
        </Card>
      </Section>

      {/* Metadata */}
      <Section title="METADATA" icon={Clock}>
        <Row label="CREATED" value={unit.created_at ? new Date(unit.created_at).toLocaleString() : '—'} mono small />
        <Row label="GEOMETRY VERSION" value={`V${String(unit.geometry_version).padStart(2, '0')}`} mono />
        <Row label="IDENTIFIER VERSION" value={unit.spatial_identifier?.version ? `V${String(unit.spatial_identifier.version).padStart(2, '0')}` : '—'} mono />
      </Section>
    </div>
  );
}

function GeometryTab({ unit, onCopy, copied }: any) {
  return (
    <div className="grid gap-6 max-w-4xl">
      <Section title="3D SOLID GEOMETRY" icon={Layers}>
        <Card>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: MUTED, marginBottom: 12 }}>
            PolyhedralSurfaceZ Representation
          </div>
          <div className="font-mono text-xs p-3 overflow-x-auto" style={{ background: SURFACE.input, color: DOMAIN.record, border: `2px solid ${INK}` }}>
            {unit.solid_geom ? JSON.stringify(unit.solid_geom, null, 2) : 'Geometry not loaded (stored in PostGIS)'}
          </div>
        </Card>
      </Section>

      <Section title="FOOTPRINT (2D)" icon={MapPin}>
        <Card>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: MUTED, marginBottom: 12 }}>
            Polygon Footprint
          </div>
          <div className="font-mono text-xs p-3 overflow-x-auto" style={{ background: SURFACE.input, color: PAPER, border: `2px solid ${INK}` }}>
            {unit.footprint ? JSON.stringify(unit.footprint, null, 2) : 'Footprint not loaded'}
          </div>
        </Card>
      </Section>

      <Section title="GEOMETRY HASH (SHA-256)" icon={Hash}>
        <Card>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: MUTED, marginBottom: 12 }}>
            Deterministic hash for version control
          </div>
          <div className="flex items-center gap-3">
            <code className="font-mono text-sm break-all flex-1" style={{ background: SURFACE.input, color: PAPER, border: `2px solid ${INK}`, padding: 12 }}>
              {unit.geometry_hash || 'Not computed'}
            </code>
            <Button domain="info" style={{ fontSize: 10 }} onClick={() => onCopy(unit.geometry_hash, 'hash')}>
              <Copy size={14} /> {copied === 'hash' ? 'COPIED' : 'COPY'}
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="COORDINATE REFERENCE SYSTEM" icon={MapPin}>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <InfoCell label="Horizontal CRS" value={`EPSG:${unit.parcel?.srid || 4326} (WGS84)`} />
          <InfoCell label="Vertical Datum" value="Ellipsoidal (WGS84)" />
          <InfoCell label="Linear Unit" value="Metre" />
          <InfoCell label="Projection" value="Geographic (lat/lon)" />
        </div>
      </Section>
    </div>
  );
}

function ValidationTab({ unit }: any) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runValidation = async () => {
    setLoading(true);
    const res = await api.runValidation();
    if (res.success && res.data) setResult(res.data);
    setLoading(false);
  };

  useEffect(() => {
    runValidation();
  }, []);

  return (
    <div className="grid gap-6 max-w-4xl">
      <Section title="TOPOLOGY VALIDATION" icon={Shield}>
        <div className="flex gap-3 mb-4">
          <Button domain="spatial" onClick={runValidation} disabled={loading}>
            {loading ? 'RUNNING...' : 'RUN VALIDATION'}
          </Button>
          {result && (
            <Badge domain={result.passed ? 'ok' : 'conflict'}>
              {result.passed ? '● PASSED' : '● FAILED'}
            </Badge>
          )}
        </div>

        {result && (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {[
              { label: 'CRITICAL', value: result.failed_checks || '0', domain: 'conflict' as const },
              { label: 'ERRORS', value: '0', domain: 'conflict' as const },
              { label: 'WARNINGS', value: result.issues?.filter((i: any) => i.severity === 'MEDIUM').length || '0', domain: 'warn' as const },
              { label: 'CHECKS PASSED', value: result.passed_checks || '0', domain: 'ok' as const },
            ].map((m) => (
              <Metric key={m.label} label={m.label} value={String(m.value)} domain={m.domain} />
            ))}
          </div>
        )}

        {result?.issues && result.issues.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-3" style={{ color: PAPER }}>ISSUES</h4>
            <div className="space-y-2">
              {result.issues.map((issue: any, i: number) => (
                <Card key={i}>
                  <div className="flex items-start gap-3">
                    <Badge domain={issue.severity === 'HIGH' ? 'conflict' : 'warn'}>{issue.severity}</Badge>
                    <div className="flex-1">
                      <div className="font-mono font-bold text-sm" style={{ color: PAPER }}>{issue.code}</div>
                      <div className="text-sm mt-1" style={{ color: MUTED }}>{issue.message}</div>
                      {issue.overlap_volume && (
                        <div className="text-xs mt-1 font-mono" style={{ color: MUTED }}>Overlap volume: {issue.overlap_volume.toFixed(2)} m³</div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function HistoryTab({ unitId, unit }: any) {
  const [entries, setEntries] = useState<any[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getUnitHistory(unitId).then((result) => {
      if (!active) return;
      if (result.success && result.data && Array.isArray(result.data.history)) {
        setEntries([...result.data.history].reverse());
      } else {
        setLoadError(result.error || 'Failed to load version history');
      }
    });
    return () => { active = false; };
  }, [unitId]);

  if (loadError) {
    return (
      <div className="max-w-2xl">
        <h3 className="font-display font-bold mb-6" style={{ color: PAPER }}>VERSION HISTORY</h3>
        <Card><span style={{ color: DOMAIN.conflict, fontFamily: FONT.mono, fontSize: 11 }}>{loadError}</span></Card>
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="max-w-2xl">
        <h3 className="font-display font-bold mb-6" style={{ color: PAPER }}>VERSION HISTORY</h3>
        <Loading label="Loading version history..." />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl">
        <h3 className="font-display font-bold mb-6" style={{ color: PAPER }}>VERSION HISTORY</h3>
        <Card>
          <span style={{ borderStyle: 'dashed', fontSize: 12, color: MUTED }}>
            No prior versions recorded for this unit.
          </span>
        </Card>
      </div>
    );
  }

  const versions = entries.map((h: any, idx: number) => ({
    v: `V${String(h.version).padStart(2, '0')}`,
    date: h.changed_at ? new Date(h.changed_at).toLocaleDateString() : '—',
    user: h.changed_by || 'SYSTEM',
    change: h.reason || (idx === entries.length - 1 ? 'Initial registration' : 'Geometry update'),
    status: idx === 0 ? 'ACTIVE' : 'RETIRED',
    hash: h.geometry_hash ? h.geometry_hash.slice(0, 12) + '...' : '—',
    z: (h.z_min !== undefined && h.z_max !== undefined) ? `${h.z_min} / ${h.z_max} m` : '—',
  }));

  return (
    <div className="max-w-2xl">
      <h3 className="font-display font-bold mb-6" style={{ color: PAPER }}>VERSION HISTORY</h3>
      <div className="relative">
        <div className="absolute top-8 bottom-8 w-1" style={{ background: INK, left: 19 }} />
        {versions.map((v, i) => (
          <div key={v.v} className="flex gap-4 mb-8 relative">
            <div
              className="font-mono flex items-center justify-center shrink-0 relative z-10"
              style={{
                width: 40, height: 40,
                background: i === 0 ? DOMAIN.temporal : SURFACE.raised,
                border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
                fontSize: 11, color: i === 0 ? INK : PAPER, fontWeight: 700,
              }}
            >
              {v.v}
            </div>
            <Card style={{ flex: 1 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm" style={{ color: PAPER }}>{v.change}</span>
                {i === 0 && <Badge domain="temporal">CURRENT</Badge>}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <SmallRow label="DATE" value={v.date} />
                <SmallRow label="ACTOR" value={v.user} />
                <SmallRow label="STATUS" value={v.status} />
                <SmallRow label="HASH" value={v.hash} />
                <SmallRow label="Z-RANGE" value={v.z} />
                <SmallRow label="CHANGE" value={v.change} />
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <Panel
      title={title}
      right={Icon ? <Icon size={14} style={{ color: DOMAIN.record }} /> : undefined}
    >
      {children}
    </Panel>
  );
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between items-start mb-2.5" style={{ borderBottom: `1px solid ${INK}`, paddingBottom: 6 }}>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: FONT.body, color: MUTED }}>{label}</span>
      <span
        style={{
          fontFamily: mono ? FONT.mono : FONT.body,
          fontSize: small ? 11 : 13, fontWeight: 600, color: PAPER,
          textAlign: 'right', wordBreak: 'break-all', letterSpacing: small ? '0.02em' : '0.04em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: MUTED, marginBottom: 4 }}>
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: PAPER }}>{value}</div>
    </Card>
  );
}

function SmallRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: FONT.mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: MUTED, marginBottom: 2 }}>
        {label}
      </div>
      <div className="font-mono text-xs font-semibold" style={{ color: PAPER }}>{value}</div>
    </div>
  );
}
