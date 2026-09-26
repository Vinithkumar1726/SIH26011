import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, CheckCircle, ChevronRight,
  AlertCircle, Sparkles, ShieldCheck, ArrowRight
} from 'lucide-react';
import { api, type ImportAnalyzeResponse } from '../api';
import { Badge, Button, Card, Metric, Panel, StatusDot, Table, TD, TH } from '../design/primitives';
import { INK, DOMAIN, FONT, MUTED, PAPER, SURFACE, type DomainKey } from '../design/tokens';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEPS: { n: number; label: string; domain: DomainKey }[] = [
  { n: 1, label: 'IMPORT', domain: 'info' },
  { n: 2, label: 'ANALYZE', domain: 'spatial' },
  { n: 3, label: 'MAP', domain: 'record' },
  { n: 4, label: 'AI REVIEW', domain: 'ai' },
  { n: 5, label: 'VALIDATE', domain: 'ok' },
  { n: 6, label: 'GENERATE', domain: 'temporal' },
  { n: 7, label: 'EXPLORE', domain: 'spatial' },
];

const DATASETS = [
  { key: 'parcel', label: 'PARCEL DATA', fmt: 'GeoJSON', example: 'parcel.geojson' },
  { key: 'building', label: 'BUILDING DATA', fmt: 'GeoJSON', example: 'buildings.geojson' },
  { key: 'floor', label: 'FLOOR DATA', fmt: 'CSV', example: 'floors.csv' },
  { key: 'unit', label: 'PROPERTY UNIT DATA', fmt: 'GeoJSON', example: 'units.geojson' },
];

const ANALYSIS_ROWS = [
  { ds: 'Parcel', features: 1, crs: 'EPSG:4326', geom: 'Polygon', status: 'VALID' },
  { ds: 'Buildings', features: 1, crs: 'EPSG:4326', geom: 'Polygon', status: 'VALID' },
  { ds: 'Floors', features: 8, crs: '—', geom: 'Attribute', status: 'VALID' },
  { ds: 'Units', features: 4, crs: 'EPSG:4326', geom: 'Polygon', status: 'VALID' },
];

const MAPPINGS = [
  { src: 'building_id', dst: 'Building ID', ok: true },
  { src: 'floor_no', dst: 'Floor Number', ok: true },
  { src: 'unit_code', dst: 'Unit Code', ok: true },
  { src: 'area', dst: 'Area (m²)', ok: true },
  { src: 'z_min', dst: 'Minimum Elevation', ok: true },
  { src: 'z_max', dst: 'Maximum Elevation', ok: true },
  { src: 'notes', dst: '—', ok: false },
];

const AI_PROPOSALS = [
  {
    id: '#001',
    src: 'building_no',
    dst: 'building_id',
    confidence: 94,
    reason: 'Field semantics and value pattern match building identifier schema.',
  },
  {
    id: '#002',
    src: 'storey',
    dst: 'Floor Number',
    confidence: 88,
    reason: 'Integer values in range 1–8 match floor numbering convention.',
  },
  {
    id: '#003',
    src: 'sqm',
    dst: 'Area (m²)',
    confidence: 97,
    reason: 'Numeric values with decimal precision match area measurement schema.',
  },
];

const VALIDATION_CHECKS = [
  { label: 'CHECKING GEOMETRY', ok: true },
  { label: 'CHECKING FLOOR LEVELS', ok: true },
  { label: 'CHECKING UNIT BOUNDARIES', ok: true },
  { label: 'CHECKING 3D OVERLAPS', ok: true },
  { label: 'CHECKING IDENTIFIERS', ok: true },
];

const GENERATED_UNITS = [
  { id: 'U01', zMin: '0.00', zMax: '3.20', area: '84.50', vol: '270.40', spatialId: '29384756102934-B01-F01-U01-V01' },
  { id: 'U02', zMin: '0.00', zMax: '3.20', area: '76.30', vol: '244.16', spatialId: '29384756102934-B01-F01-U02-V01' },
  { id: 'U03', zMin: '3.20', zMax: '6.40', area: '84.50', vol: '270.40', spatialId: '29384756102934-B01-F02-U03-V01' },
  { id: 'U04', zMin: '3.20', zMax: '6.40', area: '76.30', vol: '244.16', spatialId: '29384756102934-B01-F02-U04-V01' },
];

export default function ImportWorkflow({ onExplore }: { onExplore: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImportAnalyzeResponse | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [proposals, setProposals] = useState<Record<string, 'pending' | 'accepted' | 'rejected'>>(
    { '#001': 'pending', '#002': 'pending', '#003': 'pending' }
  );
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function handleFileSelect(key: string, file?: File) {
    if (!file) return;
    setFiles((previous) => ({ ...previous, [key]: file }));
    setUploaded((previous) => ({ ...previous, [key]: true }));
    setWorkflowError(null);
  }

  async function runAnalyze() {
    setAnalyzing(true);
    setWorkflowError(null);
    const result = await api.analyzeImport({
      parcel: files.parcel,
      buildings: files.building,
      floors: files.floor,
      units: files.unit,
    });
    setAnalyzing(false);
    if (!result.success || !result.data) {
      setWorkflowError(result.error || 'The backend could not analyze these files.');
      return;
    }
    setAnalysisResult(result.data);
    setAnalyzed(true);
  }

  function runValidation() {
    setValidating(true);
    setTimeout(() => { setValidating(false); setValidated(true); }, 2500);
  }

  async function runGenerate() {
    setGenerating(true);
    setWorkflowError(null);
    const result = await api.persistImport({
      parcel: files.parcel,
      buildings: files.building,
      floors: files.floor,
      units: files.unit,
    });
    setGenerating(false);
    if (!result.success) {
      setWorkflowError(result.error || 'The backend could not persist the generated records.');
      return;
    }
    setGenerated(true);
  }

  const allUploaded = DATASETS.every((d) => uploaded[d.key]);
  const analysisRows = analysisResult ? [
    { ds: 'Parcel', features: analysisResult.parcel_count, crs: analysisResult.detected_crs, geom: analysisResult.geometry_types[0] || 'Unknown', status: 'VALID' },
    { ds: 'Buildings', features: analysisResult.building_count, crs: analysisResult.detected_crs, geom: analysisResult.geometry_types[1] || 'Unknown', status: 'VALID' },
    { ds: 'Floors', features: analysisResult.floor_count, crs: '—', geom: 'Attribute', status: 'VALID' },
    { ds: 'Units', features: analysisResult.unit_count, crs: analysisResult.detected_crs, geom: analysisResult.geometry_types[1] || 'Unknown', status: 'VALID' },
  ] : ANALYSIS_ROWS;

  const h2: React.CSSProperties = {
    fontFamily: FONT.display, fontWeight: 600, fontSize: 16,
    color: PAPER, letterSpacing: '0.04em',
  };
  const help: React.CSSProperties = { fontSize: 11, color: MUTED, marginTop: 4 };
  const ghostBtn: React.CSSProperties = {
    background: 'transparent', color: MUTED, border: `2px solid ${INK}`,
    fontFamily: FONT.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
    padding: '8px 14px', cursor: 'pointer',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
      {/* Workflow stepper (scrolls horizontally on narrow screens) */}
      <div
        className="flex items-center px-6 shrink-0"
        style={{ borderBottom: `3px solid ${INK}`, minHeight: 60, background: SURFACE.panel, overflowX: 'auto', paddingTop: 8, paddingBottom: 8 }}
      >
        <div className="w-full flex items-center" style={{ maxWidth: 860, margin: '0 auto' }}>
          {STEPS.map((s, i) => {
            const done = s.n < step;
            const active = s.n === step;
            return (
              <div key={s.n} className="flex items-center shrink-0" style={{ flex: i < STEPS.length - 1 ? 1 : undefined }}>
                <button
                  onClick={() => done && setStep(s.n as Step)}
                  className="flex items-center gap-2"
                  style={{ background: 'none', border: 'none', cursor: done ? 'pointer' : 'default', padding: '4px 8px' }}
                  title={done ? `Back to ${s.label}` : s.label}
                >
                  <span
                    style={{
                      width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT.mono, fontSize: 10, fontWeight: 700,
                      background: done ? DOMAIN.ok : active ? DOMAIN[s.domain] : SURFACE.raised,
                      color: done || active ? INK : MUTED,
                      border: `2px solid ${INK}`,
                    }}
                  >
                    {done ? '✓' : s.n}
                  </span>
                  <span
                    style={{
                      fontSize: 10, fontWeight: active || done ? 700 : 400,
                      letterSpacing: '0.08em',
                      color: done ? DOMAIN.ok : active ? PAPER : MUTED,
                      fontFamily: FONT.body,
                    }}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span style={{ flex: 1, height: 3, background: done ? DOMAIN.ok : INK, margin: '0 6px', minWidth: 12 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* STEP 1 — IMPORT */}
        {step === 1 && (
          <div className="max-w-3xl">
            <div className="mb-5">
              <h2 style={h2}>IMPORT CADASTRAL DATA</h2>
              <p style={help}>
                Load parcel, building, floor and property-unit datasets into the processing workspace.
              </p>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {DATASETS.map((ds, index) => (
                <motion.div
                  key={ds.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card style={{ borderColor: INK, borderWidth: 3, ...(uploaded[ds.key] ? { borderTop: `6px solid ${DOMAIN.ok}` } : {}) }}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: PAPER, fontFamily: FONT.body }}>
                          {ds.label}
                        </div>
                        <div className="font-mono" style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>
                          Accepted: {ds.fmt}
                        </div>
                      </div>
                      {uploaded[ds.key] && <Badge domain="ok">VALID</Badge>}
                    </div>

                    {uploaded[ds.key] ? (
                      <div
                        className="flex items-center gap-2"
                        style={{ background: SURFACE.input, border: `2px solid ${INK}`, padding: '8px 12px' }}
                      >
                        <CheckCircle size={12} color={DOMAIN.ok} />
                        <span className="font-mono" style={{ fontSize: 10, color: PAPER }}>
                          {ds.example}
                        </span>
                        <span className="font-mono" style={{ fontSize: 9, color: MUTED, marginLeft: 'auto' }}>
                          1.24 MB
                        </span>
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center gap-2"
                        style={{
                          background: SURFACE.input, border: `2px dashed ${INK}`,
                          padding: '20px 16px', cursor: 'pointer',
                        }}
                        onClick={() => document.getElementById(`file-${ds.key}`)?.click()}
                      >
                        <input
                          id={`file-${ds.key}`}
                          type="file"
                          accept={ds.fmt === 'CSV' ? '.csv,text/csv' : '.geojson,application/geo+json,application/json'}
                          className="sr-only"
                          ref={(el) => { fileInputs.current[ds.key] = el; }}
                          onChange={(e) => handleFileSelect(ds.key, e.target.files?.[0])}
                        />
                        <Upload size={16} color={MUTED} />
                        <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT.body }}>
                          + DROP FILE HERE
                        </span>
                        <span style={{ fontSize: 9, color: MUTED }}>or browse files</span>
                        <span className="font-mono" style={{ fontSize: 8, color: MUTED }}>{ds.fmt}</span>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Button domain="info">CANCEL</Button>
              <Button domain="spatial" disabled={!allUploaded} onClick={() => { setStep(2); runAnalyze(); }}>
                ANALYZE DATA →
              </Button>
            </div>
            {workflowError && (
              <Card style={{ marginTop: 16 }}>
                <span className="flex items-center gap-2" style={{ color: DOMAIN.conflict, fontFamily: FONT.mono, fontSize: 11 }}>
                  <AlertCircle size={12} />{workflowError}
                </span>
              </Card>
            )}
          </div>
        )}

        {/* STEP 2 — ANALYZE */}
        {step === 2 && (
          <div className="max-w-3xl">
            <h2 style={h2}>DATA ANALYSIS</h2>
            <p style={{ ...help, marginBottom: 16 }}>
              Inspecting imported datasets for geometry, CRS, and attribute completeness.
            </p>

            {analyzing && (
              <div className="flex items-center gap-3 mb-5" style={{ color: DOMAIN.warn }}>
                <StatusDot domain="warn" size={10} />
                <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
                  ANALYZING DATASETS...
                </span>
              </div>
            )}

            {analyzed && (
              <>
                <Panel>
                  <div style={{ overflowX: 'auto' }}>
                    <Table>
                      <thead>
                        <tr>
                          {['DATASET', 'FEATURES', 'CRS', 'GEOMETRY', 'STATUS'].map((h) => (
                            <TH key={h}>{h}</TH>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysisRows.map((row, i) => (
                          <tr key={i}>
                            <TD accent>{row.ds}</TD>
                            <TD>{row.features}</TD>
                            <TD>{row.crs}</TD>
                            <TD>{row.geom}</TD>
                            <TD><Badge domain="ok">{row.status}</Badge></TD>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Panel>

                <div className="grid gap-3 mb-5 grid-cols-2 xl:grid-cols-4" style={{ marginTop: 16 }}>
                  {[
                    { label: 'FEATURE COUNT', value: '14', domain: 'info' as DomainKey },
                    { label: 'GEOMETRIES', value: '10', domain: 'spatial' as DomainKey },
                    { label: 'ATTRIBUTES', value: '37', domain: 'record' as DomainKey },
                    { label: 'INVALID RECORDS', value: '0', domain: 'ok' as DomainKey },
                  ].map((m) => (
                    <Metric key={m.label} label={m.label} value={m.value} domain={m.domain} />
                  ))}
                </div>

                <div className="flex gap-3">
                  <button style={ghostBtn} onClick={() => setStep(1)}>← BACK</button>
                  <Button domain="spatial" onClick={() => setStep(3)}>MAP FIELDS →</Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 3 — MAP */}
        {step === 3 && (
          <div className="max-w-3xl">
            <h2 style={h2}>MAP SOURCE FIELDS</h2>
            <p style={{ ...help, marginBottom: 16 }}>
              Map source attributes to the 3D cadastral schema.
            </p>

            <Panel>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 340 }}>
                  <div className="grid px-4 py-2" style={{ gridTemplateColumns: '1fr 40px 1fr 32px', borderBottom: `2px solid ${INK}` }}>
                    <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em', fontWeight: 700 }}>SOURCE FIELD</span>
                    <span />
                    <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em', fontWeight: 700 }}>TARGET FIELD</span>
                    <span />
                  </div>
                  {MAPPINGS.map((m, i) => (
                    <div
                      key={i}
                      className="grid items-center px-4 py-2.5"
                      style={{ gridTemplateColumns: '1fr 40px 1fr 32px', borderBottom: i < MAPPINGS.length - 1 ? `1px solid ${INK}` : undefined }}
                    >
                      <span className="font-mono" style={{ fontSize: 11, color: MUTED }}>{m.src}</span>
                      <ArrowRight size={12} color={m.ok ? DOMAIN.spatial : MUTED} />
                      <span className="font-mono" style={{ fontSize: 11, color: m.ok ? PAPER : MUTED }}>
                        {m.dst}
                      </span>
                      {m.ok ? (
                        <CheckCircle size={12} color={DOMAIN.ok} />
                      ) : (
                        <Badge domain="info">OPT</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <div className="flex gap-3" style={{ marginTop: 16 }}>
              <button style={ghostBtn} onClick={() => setStep(2)}>← BACK</button>
              <Button domain="record" onClick={() => setStep(4)}>AI REVIEW →</Button>
            </div>
          </div>
        )}

        {/* STEP 4 — AI REVIEW */}
        {step === 4 && (
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-1">
              <Sparkles size={14} color={DOMAIN.ai} />
              <h2 style={h2}>AI-ASSISTED MAPPING REVIEW</h2>
            </div>
            <p style={{ ...help, marginBottom: 16 }}>
              AI suggestions for field mappings and anomaly detection. Review and approve proposals.
            </p>

            <div className="flex flex-col gap-3 mb-5">
              {AI_PROPOSALS.map((p) => (
                <Panel
                  key={p.id}
                  accent={proposals[p.id] === 'accepted' ? 'ok' : proposals[p.id] === 'rejected' ? 'conflict' : 'ai'}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: DOMAIN.ai, letterSpacing: '0.1em', fontWeight: 700 }}>
                          AI PROPOSAL {p.id}
                        </span>
                        {proposals[p.id] !== 'pending' && (
                          <Badge domain={proposals[p.id] === 'accepted' ? 'ok' : 'conflict'}>
                            {proposals[p.id].toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono" style={{ fontSize: 11, color: MUTED, background: SURFACE.input, padding: '2px 8px', border: `2px solid ${INK}` }}>
                          {p.src}
                        </span>
                        <ArrowRight size={12} color={DOMAIN.ai} />
                        <span className="font-mono" style={{ fontSize: 11, color: PAPER, background: SURFACE.raised, padding: '2px 8px', border: `2px solid ${INK}` }}>
                          {p.dst}
                        </span>
                      </div>
                      <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>{p.reason}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4">
                      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER }}>
                        {p.confidence}%
                      </div>
                      <div style={{ fontSize: 8, color: MUTED, letterSpacing: '0.08em' }}>CONFIDENCE</div>
                    </div>
                  </div>
                  {proposals[p.id] === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button domain="conflict" style={{ fontSize: 10, padding: '5px 12px' }}
                        onClick={() => setProposals(prev => ({ ...prev, [p.id]: 'rejected' }))}>
                        REJECT
                      </Button>
                      <Button domain="ok" style={{ fontSize: 10, padding: '5px 12px' }}
                        onClick={() => setProposals(prev => ({ ...prev, [p.id]: 'accepted' }))}>
                        ACCEPT
                      </Button>
                    </div>
                  )}
                </Panel>
              ))}
            </div>

            <div className="flex gap-3">
              <button style={ghostBtn} onClick={() => setStep(3)}>← BACK</button>
              <Button domain="ai" onClick={() => setStep(5)}>VALIDATE →</Button>
            </div>
          </div>
        )}

        {/* STEP 5 — VALIDATE */}
        {step === 5 && (
          <div className="max-w-3xl">
            <h2 style={h2}>TOPOLOGY & GEOMETRY VALIDATION</h2>
            <p style={{ ...help, marginBottom: 20 }}>
              Execute full spatial validation including topology, volumetric overlap, and identifier checks.
            </p>

            {!validating && !validated && (
              <Panel accent="ok">
                <div className="flex flex-col items-center justify-center" style={{ padding: 40 }}>
                  <ShieldCheck size={32} color={MUTED} style={{ marginBottom: 16 }} />
                  <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 14, color: PAPER, letterSpacing: '0.1em' }}>
                    VALIDATION ENGINE
                  </div>
                  <div className="font-mono" style={{ fontSize: 11, color: DOMAIN.ok, marginTop: 6, letterSpacing: '0.1em' }}>
                    READY
                  </div>
                </div>
              </Panel>
            )}

            {validating && (
              <Panel accent="warn">
                {VALIDATION_CHECKS.slice(0, 2).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 mb-3">
                    <CheckCircle size={12} color={DOMAIN.ok} />
                    <span className="font-mono" style={{ fontSize: 10, color: PAPER, letterSpacing: '0.06em' }}>{c.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <StatusDot domain="warn" size={10} />
                  <span className="font-mono" style={{ fontSize: 10, color: DOMAIN.warn, letterSpacing: '0.06em' }}>
                    CHECKING 3D OVERLAPS...
                  </span>
                </div>
              </Panel>
            )}

            {validated && (
              <>
                <Panel accent="ok">
                  {VALIDATION_CHECKS.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 mb-2.5">
                      <CheckCircle size={12} color={DOMAIN.ok} />
                      <span className="font-mono" style={{ fontSize: 10, color: PAPER, letterSpacing: '0.06em' }}>{c.label}</span>
                      <span className="font-mono ml-auto" style={{ fontSize: 9, color: DOMAIN.ok }}>✓</span>
                    </div>
                  ))}
                </Panel>

                <div className="grid gap-3 mb-5 grid-cols-2 xl:grid-cols-4" style={{ marginTop: 16 }}>
                  {[
                    { label: 'CRITICAL', value: '0', domain: 'ok' as DomainKey },
                    { label: 'ERRORS', value: '0', domain: 'ok' as DomainKey },
                    { label: 'WARNINGS', value: '2', domain: 'warn' as DomainKey },
                    { label: 'CHECKS PASSED', value: '18', domain: 'ok' as DomainKey },
                  ].map((m) => (
                    <Metric key={m.label} label={m.label} value={m.value} domain={m.domain} />
                  ))}
                </div>

                {/* Warning table */}
                <Panel title="VALIDATION ISSUES" accent="warn">
                  <div className="flex items-start gap-3">
                    <Badge domain="warn">WARNING</Badge>
                    <div>
                      <div className="font-mono" style={{ fontSize: 10, color: PAPER }}>UNIT U04 — Minor boundary precision</div>
                      <div className="font-mono" style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>BUILDING B01 · Recommend review</div>
                    </div>
                  </div>
                </Panel>
              </>
            )}

            <div className="flex gap-3" style={{ marginTop: 16 }}>
              <button style={ghostBtn} onClick={() => setStep(4)}>← BACK</button>
              {!validated && (
                <Button domain="ok" onClick={runValidation} disabled={validating}>
                  {validating ? 'RUNNING...' : 'RUN VALIDATION'}
                </Button>
              )}
              {validated && (
                <Button domain="temporal" onClick={() => setStep(6)}>GENERATE RECORDS →</Button>
              )}
            </div>
          </div>
        )}

        {/* STEP 6 — GENERATE */}
        {step === 6 && (
          <div className="max-w-3xl">
            <h2 style={h2}>GENERATE 3D CADASTRAL RECORDS</h2>
            <p style={{ ...help, marginBottom: 20 }}>
              Transform 2D footprint + elevation data into PolyhedralSurfaceZ solids and assign versioned spatial identifiers.
            </p>

            {/* Pipeline visualization (scrolls horizontally on narrow screens) */}
            <Panel>
              <div
                className="flex items-center gap-0 mb-5 justify-start xl:justify-center"
                style={{ overflowX: 'auto' }}
              >
                {['2D FOOTPRINT', 'Z-MIN / Z-MAX', 'POLYHEDRAL SOLID', 'GEOMETRY HASH', 'SPATIAL IDENTIFIER'].map((s, i, arr) => (
                  <div key={s} className="flex items-center shrink-0">
                    <div className="flex flex-col items-center" style={{ textAlign: 'center', padding: '0 12px' }}>
                      <StatusDot domain={generated ? 'ok' : 'temporal'} size={10} />
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 8, color: generated ? DOMAIN.ok : MUTED,
                          letterSpacing: '0.06em', maxWidth: 70, textAlign: 'center', marginTop: 8,
                        }}
                      >
                        {s}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <ChevronRight size={10} color={generated ? DOMAIN.ok : MUTED} />
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            {generating && (
              <div style={{ marginBottom: 16 }}>
                <div className="flex items-center gap-3 mb-2">
                  <StatusDot domain="warn" size={10} />
                  <span className="font-mono" style={{ fontSize: 11, color: DOMAIN.warn, letterSpacing: '0.06em' }}>
                    GENERATING POLYHEDRAL SURFACES
                  </span>
                </div>
                <div style={{ height: 12, border: `2px solid ${INK}`, background: SURFACE.input }}>
                  <div style={{ height: '100%', width: '72%', background: DOMAIN.temporal }} />
                </div>
                <div className="font-mono" style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>72%</div>
              </div>
            )}

            {generated && (
              <Panel>
                <div style={{ overflowX: 'auto' }}>
                  <Table>
                    <thead>
                      <tr>
                        {['UNIT', 'Z MIN', 'Z MAX', 'AREA m²', 'VOLUME m³', 'SPATIAL IDENTIFIER', 'VER'].map((h) => (
                          <TH key={h}>{h}</TH>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GENERATED_UNITS.map((u, i) => (
                        <tr key={i}>
                          <TD><Badge domain="record">{u.id}</Badge></TD>
                          <TD>{u.zMin}</TD>
                          <TD>{u.zMax}</TD>
                          <TD>{u.area}</TD>
                          <TD>{u.vol}</TD>
                          <TD>
                            <button
                              className="font-mono"
                              style={{ background: 'none', border: 'none', color: DOMAIN.spatial, cursor: 'pointer', fontSize: 9 }}
                              onClick={() => navigator.clipboard.writeText(u.spatialId)}
                              title="Copy ID"
                            >
                              {u.spatialId}
                            </button>
                          </TD>
                          <TD>V01</TD>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Panel>
            )}

            <div className="flex gap-3" style={{ marginTop: 16 }}>
              <button style={ghostBtn} onClick={() => setStep(5)}>← BACK</button>
              {!generated && (
                <Button domain="temporal" onClick={runGenerate} disabled={generating}>
                  {generating ? 'GENERATING...' : 'GENERATE RECORDS'}
                </Button>
              )}
              {generated && (
                <Button domain="spatial" onClick={() => setStep(7)}>OPEN 3D EXPLORER →</Button>
              )}
            </div>
            {workflowError && (
              <Card style={{ marginTop: 16 }}>
                <span className="flex items-center gap-2" style={{ color: DOMAIN.conflict, fontFamily: FONT.mono, fontSize: 11 }}>
                  <AlertCircle size={12} />{workflowError}
                </span>
              </Card>
            )}
          </div>
        )}

        {/* STEP 7 — EXPLORE */}
        {step === 7 && (
          <div className="max-w-2xl flex flex-col items-center text-center" style={{ paddingTop: 60 }}>
            <CheckCircle size={48} color={DOMAIN.ok} style={{ marginBottom: 20 }} />
            <h2 style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 20, color: PAPER, letterSpacing: '0.04em', marginBottom: 8 }}>
              ✓ VALIDATION COMPLETE
            </h2>
            <Panel accent="ok">
              <div className="font-mono" style={{ fontSize: 10, color: PAPER, letterSpacing: '0.06em', lineHeight: 1.8 }}>
                18 checks passed<br />
                0 critical issues<br />
                0 topology conflicts<br />
                4 spatial identifiers generated
              </div>
            </Panel>
            <p style={{ fontSize: 11, color: MUTED, marginBottom: 24, marginTop: 16 }}>
              3D cadastral records have been generated and are ready for inspection.
            </p>
            <Button domain="spatial" onClick={onExplore}>
              OPEN 3D EXPLORER →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
