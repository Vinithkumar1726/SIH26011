import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, CheckCircle, ChevronRight, ChevronDown,
  FileText, AlertCircle, Sparkles, ShieldCheck, Box, ArrowRight, RotateCcw
} from 'lucide-react';
import { api, type ImportAnalyzeResponse } from '../api';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEPS = [
  { n: 1, label: 'IMPORT' },
  { n: 2, label: 'ANALYZE' },
  { n: 3, label: 'MAP' },
  { n: 4, label: 'AI REVIEW' },
  { n: 5, label: 'VALIDATE' },
  { n: 6, label: 'GENERATE' },
  { n: 7, label: 'EXPLORE' },
] as const;

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

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F4F1E8' }}>
      {/* Workflow stepper (scrolls horizontally on narrow screens) */}
      <div
        className="flex items-center px-6 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-primary)', minHeight: 60, background: 'var(--color-bg-tertiary)', overflowX: 'auto', paddingTop: 8, paddingBottom: 8 }}
      >
        <div className="stepper w-full" style={{ maxWidth: 860, margin: '0 auto' }}>
        {STEPS.map((s, i) => {
          const done = s.n < step;
          const active = s.n === step;
          return (
            <div key={s.n} className="flex items-center shrink-0" style={{ flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <button
                onClick={() => done && setStep(s.n as Step)}
                className="flex items-center gap-2 transition-colors"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: done ? 'pointer' : 'default',
                  padding: '4px 8px',
                }}
                title={done ? `Back to ${s.label}` : s.label}
              >
                <span className={`step-dot${done ? ' done' : active ? ' now' : ''}`}>
                  {done ? '✓' : s.n}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: active || done ? 600 : 400,
                    letterSpacing: '0.08em',
                    color: done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                    fontFamily: 'IBM Plex Sans',
                  }}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span className={`step-bar${done ? ' done' : ''}`} />
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
          <div className="fade-in max-w-3xl">
            <div className="mb-5">
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>
                IMPORT CADASTRAL DATA
              </h2>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
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
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: `1px solid ${uploaded[ds.key] ? 'var(--color-accent)' : 'var(--color-border-primary)'}`,
                    borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)',
                    padding: 16,
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--color-text-primary)' }}>
                        {ds.label}
                      </div>
                      <div className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        Accepted: {ds.fmt}
                      </div>
                    </div>
                    {uploaded[ds.key] && <span className="tag-valid">VALID</span>}
                  </div>

                  {uploaded[ds.key] ? (
                    <div
                      className="flex items-center gap-2"
                      style={{
                        background: 'rgba(var(--color-accent-rgb), 0.06)',
                        border: '1px solid rgba(var(--color-accent-rgb), 0.2)',
                        borderRadius: 2,
                        padding: '8px 12px',
                      }}
                    >
                      <CheckCircle size={12} color="var(--color-accent)" />
                      <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-accent)' }}>
                        {ds.example}
                      </span>
                      <span className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                        1.24 MB
                      </span>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center gap-2"
                      style={{
                        background: 'var(--color-bg-hover)',
                        border: '1px dashed var(--color-border-primary)',
                        borderRadius: 2,
                        padding: '20px 16px',
                        cursor: 'pointer',
                      }}
                      onClick={() => document.getElementById(`file-${ds.key}`)?.click()}
                    >
                      <input
                        id={`file-${ds.key}`}
                        type="file"
                        accept={ds.fmt === 'CSV' ? '.csv,text/csv' : '.geojson,application/geo+json,application/json'}
                        className="sr-only"
                        onChange={(e) => handleFileSelect(ds.key, e.target.files?.[0])}
                      />
                      <Upload size={16} color="var(--color-text-tertiary)" />
                      <span style={{ fontSize: 10, color: 'var(--color-text-quaternary)', fontFamily: 'IBM Plex Sans' }}>
                        + DROP FILE HERE
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>or browse files</span>
                      <span className="font-mono" style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}>{ds.fmt}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button className="brutal-btn">CANCEL</button>
              <button
                className="brutal-btn brutal-btn-primary"
                disabled={!allUploaded}
                style={{ opacity: allUploaded ? 1 : 0.4 }}
                onClick={() => { setStep(2); runAnalyze(); }}
              >
                ANALYZE DATA →
              </button>
            </div>
            {workflowError && <div className="mt-4 tag-error flex items-center gap-2"><AlertCircle size={12} />{workflowError}</div>}
          </div>
        )}

        {/* STEP 2 — ANALYZE */}
        {step === 2 && (
          <div className="fade-in max-w-3xl">
            <h2 className="font-display font-semibold mb-1" style={{ fontSize: 16, color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>
              DATA ANALYSIS
            </h2>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
              Inspecting imported datasets for geometry, CRS, and attribute completeness.
            </p>

            {analyzing && (
              <div className="flex items-center gap-3 mb-5" style={{ color: 'var(--color-accent)' }}>
                <div className="status-led warning led-pulse" />
                <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
                  ANALYZING DATASETS...
                </span>
              </div>
            )}

            {analyzed && (
              <>
                <div style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', overflow: 'hidden', marginBottom: 16 }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                        {['DATASET', 'FEATURES', 'CRS', 'GEOMETRY', 'STATUS'].map((h) => (
                          <th key={h} className="text-left px-4 py-2" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em', fontWeight: 600 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analysisRows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < ANALYSIS_ROWS.length - 1 ? '1px solid var(--color-navy-800)' : undefined }}>
                          <td className="px-4 py-3 font-mono" style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>{row.ds}</td>
                          <td className="px-4 py-3 font-mono text-right" style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>{row.features}</td>
                          <td className="px-4 py-3 font-mono" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{row.crs}</td>
                          <td className="px-4 py-3 font-mono" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{row.geom}</td>
                          <td className="px-4 py-3"><span className="tag-valid">{row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 mb-5 grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'FEATURE COUNT', value: '14' },
                    { label: 'GEOMETRIES', value: '10' },
                    { label: 'ATTRIBUTES', value: '37' },
                    { label: 'INVALID RECORDS', value: '0' },
                  ].map((m) => (
                    <div key={m.label} style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', padding: '12px 14px' }}>
                      <div className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>{m.label}</div>
                      <div className="font-display font-semibold" style={{ fontSize: 22, color: m.label === 'INVALID RECORDS' ? 'var(--color-accent)' : 'var(--color-text-primary)', marginTop: 4 }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button className="btn-ghost" onClick={() => setStep(1)}>← BACK</button>
                  <button className="brutal-btn brutal-btn-primary" onClick={() => setStep(3)}>MAP FIELDS →</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 3 — MAP */}
        {step === 3 && (
          <div className="fade-in max-w-3xl">
            <h2 className="font-display font-semibold mb-1" style={{ fontSize: 16, color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>
              MAP SOURCE FIELDS
            </h2>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
              Map source attributes to the 3D cadastral schema.
            </p>

            <div style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', overflowX: 'auto', marginBottom: 16 }}>
              <div style={{ minWidth: 340 }}>
              <div className="grid px-4 py-2" style={{ gridTemplateColumns: '1fr 40px 1fr 32px', borderBottom: '1px solid var(--color-border-primary)' }}>
                <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em', fontWeight: 600 }}>SOURCE FIELD</span>
                <span />
                <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em', fontWeight: 600 }}>TARGET FIELD</span>
                <span />
              </div>
              {MAPPINGS.map((m, i) => (
                <div
                  key={i}
                  className="grid items-center px-4 py-2.5"
                  style={{ gridTemplateColumns: '1fr 40px 1fr 32px', borderBottom: i < MAPPINGS.length - 1 ? '1px solid var(--color-navy-800)' : undefined }}
                >
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-text-quaternary)' }}>{m.src}</span>
                  <ArrowRight size={12} color={m.ok ? 'var(--color-accent)' : 'var(--color-border-primary)'} />
                  <span className="font-mono" style={{ fontSize: 11, color: m.ok ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                    {m.dst}
                  </span>
                  {m.ok ? (
                    <CheckCircle size={12} color="var(--color-accent)" />
                  ) : (
                    <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>OPT</span>
                  )}
                </div>
              ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost" onClick={() => setStep(2)}>← BACK</button>
              <button className="brutal-btn brutal-btn-primary" onClick={() => setStep(4)}>AI REVIEW →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — AI REVIEW */}
        {step === 4 && (
          <div className="fade-in max-w-3xl">
            <div className="flex items-center gap-3 mb-1">
              <Sparkles size={14} color="var(--color-accent)" />
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>
                AI-ASSISTED MAPPING REVIEW
              </h2>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
              AI suggestions for field mappings and anomaly detection. Review and approve proposals.
            </p>

            <div className="flex flex-col gap-3 mb-5">
              {AI_PROPOSALS.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: `1px solid ${proposals[p.id] === 'accepted' ? 'var(--color-accent)' : proposals[p.id] === 'rejected' ? 'var(--color-error)' : 'var(--color-border-primary)'}`,
                    borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)',
                    padding: 16,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono" style={{ fontSize: 9, color: 'var(--color-accent)', letterSpacing: '0.1em' }}>
                          AI PROPOSAL {p.id}
                        </span>
                        {proposals[p.id] !== 'pending' && (
                          <span className={proposals[p.id] === 'accepted' ? 'tag-valid' : 'tag-error'}>
                            {proposals[p.id].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-text-quaternary)', background: 'var(--color-bg-hover)', padding: '2px 8px', borderRadius: 2 }}>
                          {p.src}
                        </span>
                        <ArrowRight size={12} color="var(--color-accent)" />
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-text-primary)', background: 'var(--color-bg-hover)', padding: '2px 8px', borderRadius: 2 }}>
                          {p.dst}
                        </span>
                      </div>
                      <p style={{ fontSize: 10, color: 'var(--color-text-quaternary)', margin: 0 }}>{p.reason}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4">
                      <div className="font-display font-bold" style={{ fontSize: 18, color: p.confidence > 90 ? 'var(--color-accent)' : 'var(--color-accent)' }}>
                        {p.confidence}%
                      </div>
                      <div style={{ fontSize: 8, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em' }}>CONFIDENCE</div>
                    </div>
                  </div>
                  {proposals[p.id] === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button className="brutal-btn" style={{ fontSize: 10, padding: '5px 12px' }}
                        onClick={() => setProposals(prev => ({ ...prev, [p.id]: 'rejected' }))}>
                        REJECT
                      </button>
                      <button className="brutal-btn brutal-btn-primary" style={{ fontSize: 10, padding: '5px 12px' }}
                        onClick={() => setProposals(prev => ({ ...prev, [p.id]: 'accepted' }))}>
                        ACCEPT
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost" onClick={() => setStep(3)}>← BACK</button>
              <button className="brutal-btn brutal-btn-primary" onClick={() => setStep(5)}>VALIDATE →</button>
            </div>
          </div>
        )}

        {/* STEP 5 — VALIDATE */}
        {step === 5 && (
          <div className="fade-in max-w-3xl">
            <h2 className="font-display font-semibold mb-1" style={{ fontSize: 16, color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>
              TOPOLOGY & GEOMETRY VALIDATION
            </h2>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>
              Execute full spatial validation including topology, volumetric overlap, and identifier checks.
            </p>

            {!validating && !validated && (
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)',
                  padding: 40,
                  marginBottom: 20,
                }}
              >
                <ShieldCheck size={32} color="var(--color-border-primary)" style={{ marginBottom: 16 }} />
                <div className="font-display font-semibold" style={{ fontSize: 14, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>
                  VALIDATION ENGINE
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--color-accent)', marginTop: 6, letterSpacing: '0.1em' }}>
                  READY
                </div>
              </div>
            )}

            {validating && (
              <div style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', padding: 24, marginBottom: 20 }}>
                {VALIDATION_CHECKS.slice(0, 2).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 mb-3">
                    <CheckCircle size={12} color="var(--color-accent)" />
                    <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-accent)', letterSpacing: '0.06em' }}>{c.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <div className="status-led warning led-pulse" />
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-accent)', letterSpacing: '0.06em' }}>
                    CHECKING 3D OVERLAPS...
                  </span>
                </div>
              </div>
            )}

            {validated && (
              <>
                <div style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-accent)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', padding: 24, marginBottom: 16 }}>
                  {VALIDATION_CHECKS.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 mb-2.5">
                      <CheckCircle size={12} color="var(--color-accent)" />
                      <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-accent)', letterSpacing: '0.06em' }}>{c.label}</span>
                      <span className="font-mono ml-auto" style={{ fontSize: 9, color: 'var(--color-accent)' }}>✓</span>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 mb-5 grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'CRITICAL', value: '0', color: 'var(--color-accent)' },
                    { label: 'ERRORS', value: '0', color: 'var(--color-accent)' },
                    { label: 'WARNINGS', value: '2', color: '#D6A84F' },
                    { label: 'CHECKS PASSED', value: '18', color: 'var(--color-accent)' },
                  ].map((m) => (
                    <div key={m.label} style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', padding: '12px 14px' }}>
                      <div className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>{m.label}</div>
                      <div className="font-display font-bold" style={{ fontSize: 24, color: m.color, marginTop: 4 }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Warning table */}
                <div style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', overflow: 'hidden', marginBottom: 16 }}>
                  <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--color-text-quaternary)' }}>VALIDATION ISSUES</span>
                  </div>
                  <div className="px-4 py-3 flex items-start gap-3">
                    <span className="tag-warning">WARNING</span>
                    <div>
                      <div className="font-mono" style={{ fontSize: 10, color: 'var(--color-text-primary)' }}>UNIT U04 — Minor boundary precision</div>
                      <div className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 2 }}>BUILDING B01 · Recommend review</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button className="btn-ghost" onClick={() => setStep(4)}>← BACK</button>
              {!validated && (
                <button className="brutal-btn brutal-btn-primary" onClick={runValidation} disabled={validating}>
                  {validating ? 'RUNNING...' : 'RUN VALIDATION'}
                </button>
              )}
              {validated && (
                <button className="brutal-btn brutal-btn-primary" onClick={() => setStep(6)}>GENERATE RECORDS →</button>
              )}
            </div>
          </div>
        )}

        {/* STEP 6 — GENERATE */}
        {step === 6 && (
          <div className="fade-in max-w-3xl">
            <h2 className="font-display font-semibold mb-1" style={{ fontSize: 16, color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>
              GENERATE 3D CADASTRAL RECORDS
            </h2>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>
              Transform 2D footprint + elevation data into PolyhedralSurfaceZ solids and assign versioned spatial identifiers.
            </p>

            {/* Pipeline visualization (scrolls horizontally on narrow screens) */}
            <div
              className="flex items-center gap-0 mb-5 justify-start xl:justify-center"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', padding: '20px 24px', overflowX: 'auto' }}
            >
              {['2D FOOTPRINT', 'Z-MIN / Z-MAX', 'POLYHEDRAL SOLID', 'GEOMETRY HASH', 'SPATIAL IDENTIFIER'].map((step, i, arr) => (
                <div key={step} className="flex items-center shrink-0">
                  <div
                    className="flex flex-col items-center"
                    style={{ textAlign: 'center', padding: '0 12px' }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: generated ? 'var(--color-accent)' : 'var(--color-accent)',
                        marginBottom: 8,
                      }}
                    />
                    <span className="font-mono" style={{ fontSize: 8, color: generated ? 'var(--color-accent)' : 'var(--color-text-quaternary)', letterSpacing: '0.06em', maxWidth: 70, textAlign: 'center' }}>
                      {step}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight size={10} color={generated ? 'var(--color-accent)' : 'var(--color-border-primary)'} />
                  )}
                </div>
              ))}
            </div>

            {generating && (
              <div style={{ marginBottom: 16 }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="status-led warning led-pulse" />
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-accent)', letterSpacing: '0.06em' }}>
                    GENERATING POLYHEDRAL SURFACES
                  </span>
                </div>
                <div className="progress-bar" style={{ height: 4 }}>
                  <div className="fill" style={{ width: '72%', background: 'var(--color-accent)' }} />
                </div>
                <div className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 4 }}>72%</div>
              </div>
            )}

            {generated && (
              <div style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', overflow: 'hidden', marginBottom: 16 }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                      {['UNIT', 'Z MIN', 'Z MAX', 'AREA m²', 'VOLUME m³', 'SPATIAL IDENTIFIER', 'VER'].map((h) => (
                        <th key={h} className="text-left px-3 py-2" style={{ fontSize: 8, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GENERATED_UNITS.map((u, i) => (
                      <tr key={i} style={{ borderBottom: i < GENERATED_UNITS.length - 1 ? '1px solid var(--color-navy-800)' : undefined }}>
                        <td className="px-3 py-2.5 font-mono" style={{ fontSize: 10, color: '#C99A45' }}>{u.id}</td>
                        <td className="px-3 py-2.5 font-mono" style={{ fontSize: 10, color: 'var(--color-text-quaternary)' }}>{u.zMin}</td>
                        <td className="px-3 py-2.5 font-mono" style={{ fontSize: 10, color: 'var(--color-text-quaternary)' }}>{u.zMax}</td>
                        <td className="px-3 py-2.5 font-mono" style={{ fontSize: 10, color: 'var(--color-text-quaternary)' }}>{u.area}</td>
                        <td className="px-3 py-2.5 font-mono" style={{ fontSize: 10, color: 'var(--color-text-quaternary)' }}>{u.vol}</td>
                        <td className="px-3 py-2.5 font-mono" style={{ fontSize: 9, color: 'var(--color-accent)', letterSpacing: '0.02em' }}>
                          <button
                            className="font-mono"
                            style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 9 }}
                            onClick={() => navigator.clipboard.writeText(u.spatialId)}
                            title="Copy ID"
                          >
                            {u.spatialId}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-mono" style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>V01</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3">
              <button className="btn-ghost" onClick={() => setStep(5)}>← BACK</button>
              {!generated && (
                <button className="brutal-btn brutal-btn-primary" onClick={runGenerate} disabled={generating}>
                  {generating ? 'GENERATING...' : 'GENERATE RECORDS'}
                </button>
              )}
              {generated && (
                <button className="brutal-btn brutal-btn-primary" onClick={() => setStep(7)}>OPEN 3D EXPLORER →</button>
              )}
            </div>
            {workflowError && <div className="mt-4 tag-error flex items-center gap-2"><AlertCircle size={12} />{workflowError}</div>}
          </div>
        )}

        {/* STEP 7 — EXPLORE */}
        {step === 7 && (
          <div className="fade-in max-w-2xl flex flex-col items-center text-center" style={{ paddingTop: 60 }}>
            <CheckCircle size={48} color="var(--color-accent)" style={{ marginBottom: 20 }} />
            <h2 className="font-display font-semibold" style={{ fontSize: 20, color: 'var(--color-text-primary)', letterSpacing: '0.04em', marginBottom: 8 }}>
              ✓ VALIDATION COMPLETE
            </h2>
            <div style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-accent)', borderRadius: 'var(--brutal-radius)', boxShadow: 'var(--brutal-shadow-sm)', padding: '16px 24px', marginBottom: 24, maxWidth: 380 }}>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--color-accent)', letterSpacing: '0.06em', lineHeight: 1.8 }}>
                18 checks passed<br />
                0 critical issues<br />
                0 topology conflicts<br />
                4 spatial identifiers generated
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 24 }}>
              3D cadastral records have been generated and are ready for inspection.
            </p>
            <button className="brutal-btn brutal-btn-primary" onClick={onExplore}>
              OPEN 3D EXPLORER →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
