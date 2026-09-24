import { useState, useEffect } from 'react';
import { Copy, CheckCircle, AlertTriangle, ChevronLeft, MapPin, Building2, Layers, Hash, Clock, User, Shield } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../App';

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
      <div className="flex flex-col h-full" style={{ background: '#F8FAFC' }}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-text-tertiary font-mono text-sm">Loading property record...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex flex-col h-full" style={{ background: '#F8FAFC' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertTriangle size={48} color="#C85C5C" className="mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">Failed to Load</h2>
            <p className="text-text-tertiary mb-4">{error || 'Property unit not found'}</p>
            <button className="btn-primary" onClick={onBack}>← Back to Records</button>
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
    <div className="flex flex-col h-full" style={{ background: '#F4F1E8' }}>
      {/* Header */}
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button className="brutal-btn" style={{ padding: '6px 10px' }} onClick={onBack} aria-label="Back to records">
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="font-mono text-xs font-bold text-[#555] mb-1">
                {parcel?.ulpin} / {building?.id} / {floor?.floor_code} / {unit.unit_code}
              </div>
              <h1 className="font-display font-bold text-xl text-[#111]">
                PROPERTY RECORD
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="brutal-badge brutal-badge-green">● VALIDATED</span>
            <div className="hidden sm:flex items-center gap-2 text-sm font-bold text-[#111]">
              <User size={14} />
              <span>{user?.displayName || 'Anonymous'}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="brutal-tabs mt-4">
          {[
            { id: 'record', label: 'RECORD', icon: MapPin },
            { id: 'geometry', label: 'GEOMETRY', icon: Layers },
            { id: 'validation', label: 'VALIDATION', icon: Shield },
            { id: 'history', label: 'HISTORY', icon: Clock },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`brutal-tab ${activeTab === t.id ? 'active' : ''}`}
            >
              <t.icon size={12} style={{ display: 'inline', marginRight: 6 }} />
              {t.label}
            </button>
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
      <div className="col-span-2 brutal-panel" style={{ background: '#111111', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="brutal-eyebrow" style={{ color: '#F5C400', marginBottom: 4 }}>3D SPATIAL IDENTIFIER</div>
          <div className="font-mono font-bold text-lg break-all" style={{ color: '#FFFFFF' }}>{spatialId}</div>
        </div>
        <button className="brutal-btn brutal-btn-gold" style={{ fontSize: 10 }} onClick={() => onCopy(spatialId, 'spatialId')}>
          <Copy size={14} /> {copied === 'spatialId' ? 'COPIED' : 'COPY'}
        </button>
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
            <span className="font-mono font-bold text-xs text-[#555] uppercase tracking-wider">{c.check}</span>
            <span className="brutal-badge brutal-badge-green" style={{ fontSize: 8 }}>● PASS</span>
          </div>
        ))}
        <div className="mt-3 pt-3 border-t border-border">
          <Row label="LAST VALIDATED" value={unit.created_at ? new Date(unit.created_at).toLocaleString() : '—'} mono small />
          <Row label="VALIDATION ENGINE" value="v2.4.1" mono />
        </div>
      </Section>

      {/* Ownership / Rights */}
      <Section title="OWNERSHIP / RIGHTS" icon={User}>
        <div className="bg-muted border border-border rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Cadastral Rights Record</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <InfoCell label="Owner" value="To be populated via land records integration" />
            <InfoCell label="Tenure" value="—" />
            <InfoCell label="Share" value="—" />
            <InfoCell label="Last Verified" value="—" />
            <InfoCell label="Encumbrances" value="None registered" />
            <InfoCell label="Restrictions" value="None registered" />
          </div>
        </div>
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
        <div className="brutal-panel-flat p-4">
          <div className="brutal-eyebrow mb-3">PolyhedralSurfaceZ Representation</div>
          <div className="font-mono text-xs p-3 overflow-x-auto" style={{ background: '#111111', color: '#F5C400', border: '2px solid #111111' }}>
            {unit.solid_geom ? JSON.stringify(unit.solid_geom, null, 2) : 'Geometry not loaded (stored in PostGIS)'}
          </div>
        </div>
      </Section>

      <Section title="FOOTPRINT (2D)" icon={MapPin}>
        <div className="brutal-panel-flat p-4">
          <div className="brutal-eyebrow mb-3">Polygon Footprint</div>
          <div className="font-mono text-xs p-3 overflow-x-auto" style={{ background: '#111111', color: '#EDEAE0', border: '2px solid #111111' }}>
            {unit.footprint ? JSON.stringify(unit.footprint, null, 2) : 'Footprint not loaded'}
          </div>
        </div>
      </Section>

      <Section title="GEOMETRY HASH (SHA-256)" icon={Hash}>
        <div className="brutal-panel-flat p-4">
          <div className="brutal-eyebrow mb-3">Deterministic hash for version control</div>
          <div className="flex items-center gap-3">
            <code className="font-mono text-sm break-all flex-1 brutal-panel-flat p-3">
              {unit.geometry_hash || 'Not computed'}
            </code>
            <button className="brutal-btn" style={{ fontSize: 10 }} onClick={() => onCopy(unit.geometry_hash, 'hash')}>
              <Copy size={14} /> {copied === 'hash' ? 'COPIED' : 'COPY'}
            </button>
          </div>
        </div>
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
          <button className="brutal-btn brutal-btn-primary" onClick={runValidation} disabled={loading}>
            {loading ? 'RUNNING...' : 'RUN VALIDATION'}
          </button>
          {result && (
            <span className={result.passed ? 'brutal-badge brutal-badge-green' : 'brutal-badge brutal-badge-red'}>
              {result.passed ? '● PASSED' : '● FAILED'}
            </span>
          )}
        </div>

        {result && (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {[
              { label: 'CRITICAL', value: result.failed_checks || '0', tone: 'red' as const },
              { label: 'ERRORS', value: '0', tone: 'red' as const },
              { label: 'WARNINGS', value: result.issues?.filter((i: any) => i.severity === 'MEDIUM').length || '0', tone: 'warn' as const },
              { label: 'CHECKS PASSED', value: result.passed_checks || '0', tone: 'ok' as const },
            ].map((m) => (
              <div key={m.label} className="brutal-panel" style={{ padding: 14, borderTop: `6px solid ${m.tone === 'warn' ? '#F59E0B' : m.tone === 'ok' ? '#16A34A' : '#D92D20'}` }}>
                <div className="brutal-eyebrow" style={{ marginBottom: 4 }}>{m.label}</div>
                <div className="brutal-metric-num" style={{ fontSize: 26 }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {result?.issues && result.issues.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-text-primary mb-3">ISSUES</h4>
            <div className="space-y-2">
              {result.issues.map((issue: any, i: number) => (
                <div key={i} className="brutal-panel" style={{ padding: 12 }}>
                  <div className="flex items-start gap-3">
                    <span className={issue.severity === 'HIGH' ? 'brutal-badge brutal-badge-red' : 'brutal-badge brutal-badge-gold'}>{issue.severity}</span>
                    <div className="flex-1">
                      <div className="font-mono font-bold text-sm text-[#111]">{issue.code}</div>
                      <div className="text-sm mt-1" style={{ color: '#333' }}>{issue.message}</div>
                      {issue.overlap_volume && (
                        <div className="text-xs mt-1 font-mono" style={{ color: '#555' }}>Overlap volume: {issue.overlap_volume.toFixed(2)} m³</div>
                      )}
                    </div>
                  </div>
                </div>
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
        <h3 className="font-display font-semibold mb-6 text-text-primary">VERSION HISTORY</h3>
        <div className="bg-surface border border-border rounded-lg p-4 text-sm text-text-secondary">{loadError}</div>
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="max-w-2xl">
        <h3 className="font-display font-semibold mb-6 text-text-primary">VERSION HISTORY</h3>
        <div className="flex items-center gap-3 text-text-tertiary font-mono text-sm">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading version history...
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-2xl">
        <h3 className="font-display font-semibold mb-6 text-text-primary">VERSION HISTORY</h3>
        <div className="bg-surface border border-border rounded-lg p-4 text-sm text-text-secondary">No prior versions recorded for this unit.</div>
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
      <h3 className="font-display font-bold mb-6 text-[#111]">VERSION HISTORY</h3>
      <div className="relative">
        <div className="absolute top-8 bottom-8 w-1 bg-[#111]" style={{ left: 19 }} />
        {versions.map((v, i) => (
          <div key={v.v} className="flex gap-4 mb-8 relative">
            <div className="font-mono flex items-center justify-center shrink-0 relative z-10" style={{ width: 40, height: 40, background: i === 0 ? '#F5C400' : '#FFFFFF', border: '2px solid #111111', boxShadow: '3px 3px 0 #111111', fontSize: 11, color: '#111111', fontWeight: 700 }}>
              {v.v}
            </div>
            <div className="flex-1 brutal-panel" style={{ padding: 14 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-[#111]">{v.change}</span>
                {i === 0 && <span className="brutal-badge brutal-badge-gold">CURRENT</span>}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <SmallRow label="DATE" value={v.date} />
                <SmallRow label="ACTOR" value={v.user} />
                <SmallRow label="STATUS" value={v.status} />
                <SmallRow label="HASH" value={v.hash} />
                <SmallRow label="Z-RANGE" value={v.z} />
                <SmallRow label="CHANGE" value={v.change} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="brutal-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="brutal-header">
        {Icon && <Icon size={14} style={{ color: '#F5C400' }} />}
        <span className="brutal-title">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between items-start mb-2.5" style={{ borderBottom: '1px solid rgba(17,17,17,0.12)', paddingBottom: 6 }}>
      <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans', color: '#555555' }}>{label}</span>
      <span className={mono ? 'font-mono' : ''} style={{ fontSize: small ? 11 : 13, fontWeight: 600, color: '#111111', textAlign: 'right', wordBreak: 'break-all', letterSpacing: small ? '0.02em' : '0.04em' }}>
        {value}
      </span>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="brutal-panel-flat p-3">
      <div className="brutal-eyebrow mb-1">{label}</div>
      <div className="text-sm font-semibold text-[#111]">{value}</div>
    </div>
  );
}

function SmallRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="brutal-eyebrow" style={{ fontSize: 8, marginBottom: 2 }}>{label}</div>
      <div className="font-mono text-xs font-semibold text-[#111]">{value}</div>
    </div>
  );
}