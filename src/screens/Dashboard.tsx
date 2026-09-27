import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Box, MapPin, Building2, Layers, ShieldCheck, Activity } from 'lucide-react';
import type { Screen } from '../types';
import { api, type DashboardStats } from '../api';
import DashboardCityPreview from '../components/DashboardCityPreview';
import { Badge, Button, Metric, Panel, StatusDot, Loading, Skeleton } from '../design/primitives';
import { INK, DOMAIN, FONT, MUTED, PAPER, SURFACE, type DomainKey } from '../design/tokens';

interface Props {
  onNav?: (s: Screen) => void;
}

const KPI_CARDS: { label: string; value: string; sub: string; icon: React.ReactNode; domain: DomainKey; trend: string }[] = [
  { label: 'PARCELS', value: '01', sub: 'REGISTERED', icon: <MapPin size={14} />, domain: 'spatial', trend: '+1 this session' },
  { label: 'VOLUMETRIC SOLIDS (3D)', value: '01', sub: 'MAPPED', icon: <Building2 size={14} />, domain: 'spatial', trend: '3 floors' },
  { label: '14-DIGIT ULPINs GENERATED', value: '04', sub: '3D REGISTERED', icon: <Layers size={14} />, domain: 'record', trend: 'V01 · all floors' },
  { label: 'ST_3DIntersects AUDIT', value: '100%', sub: 'PASS RATE', icon: <ShieldCheck size={14} />, domain: 'ok', trend: '18/18 checks' },
];

const ACTIVITY = [
  { time: '10:42', event: 'IMPORT SESSION COMPLETED', domain: 'ok' as DomainKey },
  { time: '10:39', event: 'TOPOLOGY VALIDATION PASSED', domain: 'ok' as DomainKey },
  { time: '10:38', event: '3D SOLIDS GENERATED', domain: 'spatial' as DomainKey },
  { time: '10:36', event: 'AI PROPOSALS REVIEWED', domain: 'ai' as DomainKey },
  { time: '10:31', event: 'BUILDING DATA IMPORTED', domain: 'record' as DomainKey },
  { time: '10:28', event: 'SESSION STARTED', domain: null },
];

const HEALTH = [
  { label: 'Geometry Integrity', value: 98 },
  { label: 'Attribute Completeness', value: 94 },
  { label: 'Topology', value: 100 },
  { label: 'Spatial IDs', value: 100 },
];

export default function Dashboard({ onNav }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aiPending, setAiPending] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    api.getDashboardStats().then((result) => {
      if (active && result.success && result.data) setStats(result.data);
    });
    api.getAICandidates().then((result) => {
      if (active && result.success && result.data) setAiPending(result.data.total ?? 0);
    });
    return () => { active = false; };
  }, []);

  const kpiCards = stats ? [
    { label: 'PARCELS', value: String(stats.total_parcels).padStart(2, '0'), sub: 'REGISTERED', icon: <MapPin size={14} />, domain: 'spatial' as DomainKey, trend: 'LIVE API' },
    { label: 'VOLUMETRIC SOLIDS (3D)', value: String(stats.total_buildings).padStart(2, '0'), sub: 'MAPPED', icon: <Building2 size={14} />, domain: 'spatial' as DomainKey, trend: `${stats.total_floors} floors` },
    { label: '14-DIGIT ULPINs GENERATED', value: String(stats.total_units).padStart(2, '0'), sub: '3D REGISTERED', icon: <Layers size={14} />, domain: 'record' as DomainKey, trend: `${stats.total_3d_units} solids` },
    { label: 'ST_3DIntersects AUDIT', value: stats.total_units ? `${Math.round((stats.validated_units / stats.total_units) * 100)}%` : '—', sub: 'PASS RATE', icon: <ShieldCheck size={14} />, domain: 'ok' as DomainKey, trend: `${stats.conflicts} conflicts` },
  ] : KPI_CARDS;

  // Skeleton loading state
  if (!stats) {
    return (
      <div className="flex flex-col h-full min-w-0 overflow-hidden" style={{ background: SURFACE.app }}>
        <div className="flex items-start justify-between gap-3 px-6 py-5 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
          <div className="min-w-0">
            <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.record, marginBottom: 2 }}>
              COMMAND OVERVIEW
            </div>
            <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: PAPER, letterSpacing: '0.01em' }}>
              CADASTRAL OVERVIEW
            </h1>
          </div>
        </div>
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-5 md:p-6 flex flex-col gap-6">
          <Loading variant="stat-card" />
          <Loading variant="stat-card" />
          <Loading variant="stat-card" />
          <Loading variant="stat-card" />
          <Skeleton variant="card" />
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden" style={{ background: SURFACE.app }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 py-5 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div className="min-w-0">
          <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.record, marginBottom: 2 }}>
            COMMAND OVERVIEW
          </div>
          <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: PAPER, letterSpacing: '0.01em' }}>
            CADASTRAL OVERVIEW
          </h1>
          <p className="mt-1" style={{ fontSize: 11, color: MUTED }}>
            3D land administration and volumetric property intelligence
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button domain="info" onClick={() => onNav?.('import')}>
            IMPORT DATA
          </Button>
          <Button domain="record" onClick={() => onNav?.('explorer')}>
            OPEN 3D EXPLORER
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-5 md:p-6 flex flex-col gap-6">
        <Panel eyebrow="LIVE REGISTRY · COIMBATORE TILE" title="3D BHU-AADHAAR (ULPIN) TWIN" accent="record">
          <p className="mx-auto mb-4" style={{ fontSize: 13, lineHeight: 1.6, color: MUTED }}>
            Integrated Land Information Management System (ILIMS) powered by YOLOv11 AI and NASA SRTM 30m True-Elevation.
          </p>
          <Badge domain="ok"><StatusDot domain="ok" size={7} />REGISTRY ONLINE</Badge>
        </Panel>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 pb-2">
          {kpiCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: index * 0.04 }}
            >
              <Metric
                label={card.label}
                value={card.value}
                sub={`${card.sub} · ${card.trend}`}
                domain={card.domain}
              />
            </motion.div>
          ))}
        </div>

        {/* Main area */}
        <div className="flex flex-col xl:flex-row gap-6 min-w-0">
          {/* 3D city preview */}
          <div className="min-w-0 flex-1">
            <DashboardCityPreview onLaunch={() => onNav?.('explorer')} />
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-6 w-full xl:w-72 shrink-0 min-w-0">
            {/* Recent alerts (live backend data only) */}
            <Panel title="Recent Alerts" accent="warn">
              <div className="flex flex-col gap-2">
                {stats && stats.conflicts > 0 && (
                  <Badge domain="conflict">▲ {stats.conflicts} spatial conflict(s) need review</Badge>
                )}
                {aiPending !== null && aiPending > 0 && (
                  <Badge domain="ai">◎ {aiPending} AI proposal(s) awaiting review</Badge>
                )}
                {stats && stats.conflicts === 0 && (
                  <Badge domain="ok">● Validation clean — no overlaps</Badge>
                )}
                {(stats === null && aiPending === null) && (
                  <div style={{ height: 60, border: `2px dashed ${INK}`, background: SURFACE.raised }} />
                )}
              </div>
            </Panel>
            {/* Activity */}
            <Panel title="System Activity">
              <div className="px-1 py-1 relative">
                <span className="absolute left-[13px] top-4 bottom-4 w-0.5" style={{ background: INK }} aria-hidden />
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="relative flex gap-3 items-start mb-2.5 pl-1">
                    <StatusDot domain={a.domain ?? 'info'} size={9} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: MUTED, letterSpacing: '0.04em', minWidth: 38 }}>
                      {a.time}
                    </span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: PAPER, fontWeight: 700, letterSpacing: '0.04em' }}>
                      {a.event}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Data health */}
            <Panel title="DATA HEALTH">
              {HEALTH.map((h) => (
                <div key={h.label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FONT.body, color: PAPER }}>
                      {h.label}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT.mono, fontSize: 10, fontWeight: 700,
                        color: h.value === 100 ? DOMAIN.ok : DOMAIN.warn,
                      }}
                    >
                      {h.value}%
                    </span>
                  </div>
                  <div style={{ height: 12, border: `2px solid ${INK}`, background: SURFACE.input }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${h.value}%`,
                        background: h.value === 100 ? DOMAIN.ok : DOMAIN.record,
                      }}
                    />
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              title: 'IMPORT NEW DATA',
              desc: 'Upload GeoJSON / CSV cadastral datasets.',
              screen: 'import' as Screen,
              icon: <Upload size={14} />,
              domain: 'info' as DomainKey,
            },
            {
              title: 'VALIDATE DATA',
              desc: 'Run topology and geometry validation.',
              screen: 'validation' as Screen,
              icon: <ShieldCheck size={14} />,
              domain: 'ok' as DomainKey,
            },
            {
              title: 'EXPLORE 3D',
              desc: 'Open interactive 3D cadastral viewer.',
              screen: 'explorer' as Screen,
              icon: <Box size={14} />,
              domain: 'spatial' as DomainKey,
            },
            {
              title: 'SEARCH PROPERTY',
              desc: 'Find parcel, building, floor or unit.',
              screen: 'identifiers' as Screen,
              icon: <Activity size={14} />,
              domain: 'record' as DomainKey,
            },
          ].map((action, index) => (
            <motion.button
              key={action.title}
              onClick={() => onNav?.(action.screen)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: index * 0.04 }}
              whileTap={{ scale: 0.98 }}
              className="text-left"
              style={{
                background: SURFACE.panel, border: `3px solid ${INK}`,
                boxShadow: `4px 4px 0 ${INK}`, padding: 16, cursor: 'pointer',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: INK, background: DOMAIN[action.domain], border: `2px solid ${INK}`, padding: 3, display: 'inline-flex' }}>
                  {action.icon}
                </span>
                <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 11, color: PAPER, letterSpacing: '0.06em' }}>
                  {action.title} →
                </span>
              </div>
              <p className="m-0" style={{ fontSize: 11, color: MUTED }}>
                {action.desc}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
