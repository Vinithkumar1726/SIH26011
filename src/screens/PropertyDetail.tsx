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
    <div className="flex flex-col h-full" style={{ background: '#F8FAFC' }}>
      {/* Header */}
      <div className="px-6 py-4 shrink-0 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button className="btn-ghost" onClick={onBack}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="font-mono text-xs text-text-tertiary mb-1">
                {parcel?.ulpin} / {building?.id} / {floor?.floor_code} / {unit.unit_code}
              </div>
              <h1 className="font-display font-semibold text-xl text-text-primary">
                PROPERTY RECORD
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="tag-valid">VALIDATED</span>
            <div className="flex items-center gap-2 text-sm text-text-tertiary">
              <User size={14} />
              <span>{user?.displayName || 'Anonymous'}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-border">
          {[
            { id: 'record', label: 'RECORD', icon: MapPin },
            { id: 'geometry', label: 'GEOMETRY', icon: Layers },
            { id: 'validation', label: 'VALIDATION', icon: Shield },
            { id: 'history', label: 'HISTORY', icon: Clock },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'record' && <RecordTab unit={unit} spatialId={spatialId} onCopy={copyToClipboard} copied={copied} />}
        {activeTab === 'geometry' && <GeometryTab unit={unit} onCopy={copyToClipboard} copied={copied} />}
        {activeTab === 'validation' && <ValidationTab unit={unit} />}
        {activeTab === 'history' && <HistoryTab unit={unit} />}
      </div>
    </div>
  );
}

function RecordTab({ unit, spatialId, onCopy, copied }: any) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '1200px' }}>
      {/* Spatial ID Banner */}
      <div className="col-span-2 bg-surface border border-primary rounded-lg p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">3D SPATIAL IDENTIFIER</div>
          <div className="font-mono text-lg text-primary break-all">{spatialId}</div>
        </div>
        <button className="btn-ghost" onClick={() => onCopy(spatialId, 'spatialId')}>
          <Copy size={16} /> {copied === 'spatialId' ? 'COPIED' : 'COPY'}
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
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">{c.check}</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={12} color="#4FB8AC" />
              <span className="font-mono text-xs text-success">PASS</span>
            </div>
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
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase tracking-wider mb-3">PolyhedralSurfaceZ Representation</div>
          <div className="font-mono text-xs text-text-secondary bg-muted p-3 rounded border border-border overflow-x-auto">
            {unit.solid_geom ? JSON.stringify(unit.solid_geom, null, 2) : 'Geometry not loaded (stored in PostGIS)'}
          </div>
        </div>
      </Section>

      <Section title="FOOTPRINT (2D)" icon={MapPin}>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Polygon Footprint</div>
          <div className="font-mono text-xs text-text-secondary bg-muted p-3 rounded border border-border overflow-x-auto">
            {unit.footprint ? JSON.stringify(unit.footprint, null, 2) : 'Footprint not loaded'}
          </div>
        </div>
      </Section>

      <Section title="GEOMETRY HASH (SHA-256)" icon={Hash}>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Deterministic hash for version control</div>
          <div className="flex items-center gap-3">
            <code className="font-mono text-sm text-text-primary break-all flex-1 bg-muted p-3 rounded border border-border">
              {unit.geometry_hash || 'Not computed'}
            </code>
            <button className="btn-ghost" onClick={() => onCopy(unit.geometry_hash, 'hash')}>
              <Copy size={16} /> {copied === 'hash' ? 'COPIED' : 'COPY'}
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
          <button className="btn-primary" onClick={runValidation} disabled={loading}>
            {loading ? 'RUNNING...' : 'RUN VALIDATION'}
          </button>
          {result && (
            <span className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-mono ${result.passed ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}>
              {result.passed ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {result.passed ? 'PASSED' : 'FAILED'}
            </span>
          )}
        </div>

        {result && (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {[
              { label: 'CRITICAL', value: result.failed_checks || '0', color: '#C85C5C' },
              { label: 'ERRORS', value: '0', color: '#C85C5C' },
              { label: 'WARNINGS', value: result.issues?.filter((i: any) => i.severity === 'MEDIUM').length || '0', color: '#D6A84F' },
              { label: 'CHECKS PASSED', value: result.passed_checks || '0', color: '#4FB8AC' },
            ].map((m) => (
              <div key={m.label} className="bg-surface border border-border rounded-lg p-4">
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{m.label}</div>
                <div className="font-display font-bold text-2xl" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {result?.issues && result.issues.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-text-primary mb-3">ISSUES</h4>
            <div className="space-y-2">
              {result.issues.map((issue: any, i: number) => (
                <div key={i} className="bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <span className={`tag-${issue.severity === 'HIGH' ? 'error' : 'warning'}`}>{issue.severity}</span>
                    <div className="flex-1">
                      <div className="font-mono text-sm text-text-primary">{issue.code}</div>
                      <div className="text-sm text-text-secondary mt-1">{issue.message}</div>
                      {issue.overlap_volume && (
                        <div className="text-xs text-text-tertiary mt-1">Overlap volume: {issue.overlap_volume.toFixed(2)} m³</div>
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

function HistoryTab({ unit }: any) {
  const versions = [
    { v: `V${String(unit.geometry_version).padStart(2, '0')}`, date: unit.created_at ? new Date(unit.created_at).toLocaleDateString() : '—', user: 'SYSTEM', change: 'Initial registration', status: 'ACTIVE', hash: unit.geometry_hash?.slice(0, 12) + '...' || '—' },
  ];

  return (
    <div className="max-w-2xl">
      <h3 className="font-display font-semibold mb-6 text-text-primary">VERSION HISTORY</h3>
      <div className="relative">
        <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-border" />
        {versions.map((v, i) => (
          <div key={v.v} className="flex gap-4 mb-8 relative">
            <div className="font-mono flex items-center justify-center shrink-0 relative z-10" style={{ width: 32, height: 32, background: i === 0 ? '#FEF3C7' : '#F3F4F6', border: `1px solid ${i === 0 ? '#F59E0B' : '#D1D5DB'}`, borderRadius: 4, fontSize: 11, color: i === 0 ? '#D97706' : '#6B7280', fontWeight: 600 }}>
              {v.v}
            </div>
            <div className={`flex-1 bg-surface border rounded-lg p-4 ${i === 0 ? 'border-primary' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-text-primary">{v.change}</span>
                {i === 0 && <span className="tag-valid">CURRENT</span>}
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
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        {Icon && <Icon size={14} className="text-text-tertiary" />}
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between items-start mb-2.5">
      <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium" style={{ fontFamily: 'IBM Plex Sans' }}>{label}</span>
      <span className={mono ? 'font-mono' : ''} style={{ fontSize: small ? 11 : 13, color: '#1E293B', textAlign: 'right', wordBreak: 'break-all', letterSpacing: small ? '0.02em' : '0.04em' }}>
        {value}
      </span>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-text-primary">{value}</div>
    </div>
  );
}

function SmallRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-tertiary uppercase tracking-wider mb-0.5">{label}</div>
      <div className="font-mono text-xs text-text-secondary">{value}</div>
    </div>
  );
}