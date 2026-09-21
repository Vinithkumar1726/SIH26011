import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Box, MapPin, Building2, Layers, ShieldCheck, ChevronRight, Activity } from 'lucide-react';
import type { Screen } from '../types';
import { api, type DashboardStats } from '../api';

interface Props {
  onNav: (s: Screen) => void;
}

const KPI_CARDS = [
  { label: 'PARCELS', value: '01', sub: 'REGISTERED', icon: <MapPin size={14} />, color: '#C99A45', trend: '+1 this session' },
  { label: 'BUILDINGS', value: '01', sub: 'MAPPED', icon: <Building2 size={14} />, color: '#4FB8AC', trend: '3 floors' },
  { label: 'PROPERTY UNITS', value: '04', sub: '3D REGISTERED', icon: <Layers size={14} />, color: '#C99A45', trend: 'V01 · all floors' },
  { label: 'VALIDATION', value: '100%', sub: 'PASS RATE', icon: <ShieldCheck size={14} />, color: '#4FB8AC', trend: '18/18 checks' },
];

const ACTIVITY = [
  { time: '10:42', event: 'IMPORT SESSION COMPLETED', ok: true },
  { time: '10:39', event: 'TOPOLOGY VALIDATION PASSED', ok: true },
  { time: '10:38', event: '3D SOLIDS GENERATED', ok: true },
  { time: '10:36', event: 'AI PROPOSALS REVIEWED', ok: true },
  { time: '10:31', event: 'BUILDING DATA IMPORTED', ok: true },
  { time: '10:28', event: 'SESSION STARTED', ok: null },
];

const HEALTH = [
  { label: 'Geometry Integrity', value: 98 },
  { label: 'Attribute Completeness', value: 94 },
  { label: 'Topology', value: 100 },
  { label: 'Spatial IDs', value: 100 },
];

// Isometric building SVG
function IsoBuildingPreview() {
  return (
    <svg viewBox="0 0 420 320" className="w-full h-full" style={{ fontFamily: 'IBM Plex Mono' }}>
      <defs>
        <pattern id="bgGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1B222C" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="420" height="320" fill="url(#bgGrid)" />

      {/* Parcel boundary */}
      <polygon points="60,260 210,190 360,260 210,330" fill="none" stroke="#C99A45" strokeWidth="1" strokeDasharray="6,3" />
      <text x="210" y="345" fill="#C99A45" fontSize="8" textAnchor="middle" letterSpacing="1">ULPIN: 29384756102934</text>

      {/* Floor 1 */}
      <polygon points="90,230 210,162 330,230 210,298" fill="#1B222C" stroke="#28313C" strokeWidth="1" />
      <polygon points="90,230 90,206 210,138 210,162" fill="#151B23" stroke="#28313C" strokeWidth="1" />
      <polygon points="330,230 330,206 210,138 210,162" fill="#10151C" stroke="#28313C" strokeWidth="1" />
      {/* F1 units */}
      <line x1="150" y1="246" x2="150" y2="178" stroke="#28313C" strokeWidth="0.8" />
      <text x="125" y="222" fill="#4FB8AC" fontSize="7" letterSpacing="1">U01</text>
      <text x="220" y="222" fill="#4FB8AC" fontSize="7" letterSpacing="1">U02</text>

      {/* Floor 2 */}
      <polygon points="90,206 210,138 330,206 210,274" fill="#1B222C" stroke="#28313C" strokeWidth="1" />
      <polygon points="90,206 90,182 210,114 210,138" fill="#151B23" stroke="#28313C" strokeWidth="1" />
      <polygon points="330,206 330,182 210,114 210,138" fill="#10151C" stroke="#28313C" strokeWidth="1" />
      <line x1="150" y1="222" x2="150" y2="154" stroke="#28313C" strokeWidth="0.8" />
      <text x="125" y="198" fill="#4FB8AC" fontSize="7" letterSpacing="1">U03</text>
      <text x="220" y="198" fill="#4FB8AC" fontSize="7" letterSpacing="1">U04</text>

      {/* Floor 3 */}
      <polygon points="100,182 210,118 320,182 210,246" fill="#1B222C" stroke="#C99A45" strokeWidth="1.2" />
      <polygon points="100,182 100,158 210,94 210,118" fill="#151B23" stroke="#C99A45" strokeWidth="1.2" />
      <polygon points="320,182 320,158 210,94 210,118" fill="#10151C" stroke="#C99A45" strokeWidth="1.2" />

      {/* Elevation markers */}
      <line x1="40" y1="258" x2="56" y2="258" stroke="#6E7783" strokeWidth="0.5" />
      <line x1="40" y1="234" x2="56" y2="234" stroke="#6E7783" strokeWidth="0.5" />
      <line x1="40" y1="210" x2="56" y2="210" stroke="#6E7783" strokeWidth="0.5" />
      <line x1="40" y1="186" x2="56" y2="186" stroke="#6E7783" strokeWidth="0.5" />
      <line x1="40" y1="258" x2="40" y2="186" stroke="#6E7783" strokeWidth="0.5" />
      <text x="36" y="261" fill="#6E7783" fontSize="7" textAnchor="end">+0.00</text>
      <text x="36" y="237" fill="#6E7783" fontSize="7" textAnchor="end">+3.20</text>
      <text x="36" y="213" fill="#6E7783" fontSize="7" textAnchor="end">+6.40</text>
      <text x="36" y="189" fill="#6E7783" fontSize="7" textAnchor="end">+9.60</text>
      <text x="38" y="175" fill="#6E7783" fontSize="7" textAnchor="end">M</text>

      {/* Selected unit highlight */}
      <polygon points="90,230 150,198 150,174 90,206" fill="#C99A45" fillOpacity="0.12" stroke="#C99A45" strokeWidth="1.5" />
      <text x="105" y="215" fill="#C99A45" fontSize="8" fontWeight="600" letterSpacing="1">U01</text>

      {/* Labels */}
      <text x="210" y="86" fill="#A8B0BA" fontSize="9" textAnchor="middle" letterSpacing="2">BUILDING B01</text>
      <text x="210" y="97" fill="#6E7783" fontSize="7" textAnchor="middle" letterSpacing="1">3 FLOORS · 4 UNITS</text>
    </svg>
  );
}

export default function Dashboard({ onNav }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let active = true;
    api.getDashboardStats().then((result) => {
      if (active && result.success && result.data) setStats(result.data);
    });
    return () => { active = false; };
  }, []);

  const kpiCards = stats ? [
    { label: 'PARCELS', value: String(stats.total_parcels).padStart(2, '0'), sub: 'REGISTERED', icon: <MapPin size={14} />, color: '#C99A45', trend: 'LIVE API' },
    { label: 'BUILDINGS', value: String(stats.total_buildings).padStart(2, '0'), sub: 'MAPPED', icon: <Building2 size={14} />, color: '#4FB8AC', trend: `${stats.total_floors} floors` },
    { label: 'PROPERTY UNITS', value: String(stats.total_units).padStart(2, '0'), sub: '3D REGISTERED', icon: <Layers size={14} />, color: '#C99A45', trend: `${stats.total_3d_units} solids` },
    { label: 'VALIDATION', value: stats.total_units ? `${Math.round((stats.validated_units / stats.total_units) * 100)}%` : '—', sub: 'PASS RATE', icon: <ShieldCheck size={14} />, color: '#4FB8AC', trend: `${stats.conflicts} conflicts` },
  ] : KPI_CARDS;

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 py-5 shrink-0">
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-xl text-white tracking-[0.04em]">
            CADASTRAL OVERVIEW
          </h1>
          <p className="mt-1 text-[11px] text-slate-400" style={{ fontFamily: 'IBM Plex Sans' }}>
            3D land administration and volumetric property intelligence
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onNav('import')}
            className="rounded-xl border border-white/15 px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-slate-300 transition-colors hover:border-white/30 hover:text-white"
          >
            IMPORT DATA
          </button>
          <button
            onClick={() => onNav('explorer')}
            className="rounded-xl px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-slate-950 transition-colors hover:brightness-110"
            style={{ background: '#C99A45' }}
          >
            OPEN 3D EXPLORER
          </button>
        </div>
      </div>

      <section id="hero-particle-container" aria-label="3D Particle Visualization" className="glass-panel mx-6 mb-2 px-6 py-10 text-center shrink-0">
        <h2 className="font-display font-semibold text-white tracking-[0.04em] mb-3" style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>
          3D CADASTRAL VISUALIZATION
        </h2>
        <p className="mx-auto mb-6 max-w-[600px] text-slate-400" style={{ fontSize: 'clamp(12px, 1.5vw, 14px)', lineHeight: 1.6 }}>
          Interactive 3D particle visualization of cadastral data streams. Real-time volumetric rendering with WebGL.
        </p>
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-amber-200/80">
          <span>●</span>
          <span>Particle effect container — populated separately</span>
        </div>
      </section>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-5 md:p-6 flex flex-col gap-6">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="glass-panel p-6"
              style={{ borderTop: `2px solid ${card.color}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-semibold tracking-[0.12em] text-slate-400" style={{ fontFamily: 'IBM Plex Sans' }}>
                  {card.label}
                </span>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <div className="font-display font-light text-5xl text-white tracking-tight leading-none">
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[9px] font-semibold tracking-[0.1em]" style={{ color: card.color, fontFamily: 'IBM Plex Sans' }}>
                  {card.sub}
                </span>
                <span className="font-mono text-[9px] text-slate-500">
                  {card.trend}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main area */}
        <div className="flex flex-col xl:flex-row gap-6 min-w-0">
          {/* 3D Preview */}
          <div className="glass-panel min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <span className="font-display font-medium text-[11px] text-slate-200 tracking-[0.08em]">
                3D PREVIEW
              </span>
              <button
                className="rounded-lg px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                onClick={() => onNav('explorer')}
              >
                OPEN EXPLORER <ChevronRight size={10} style={{ display: 'inline' }} />
              </button>
            </div>
            <div className="blueprint-bg min-h-[280px] p-4" style={{ height: 320 }}>
              <IsoBuildingPreview />
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-6 w-full xl:w-72 shrink-0 min-w-0">
            {/* Activity */}
            <div className="glass-panel overflow-hidden">
              <div className="px-4 py-2 border-b border-white/10">
                <span className="font-display font-medium text-[11px] text-slate-200 tracking-[0.08em]">
                  SYSTEM ACTIVITY
                </span>
              </div>
              <div className="px-4 py-3">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="flex gap-3 items-start mb-2.5">
                    <span
                      className="font-mono text-slate-500"
                      style={{ fontSize: 9, letterSpacing: '0.04em', minWidth: 38 }}
                    >
                      {a.time}
                    </span>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        color: a.ok === true ? '#4FB8AC' : a.ok === false ? '#C85C5C' : '#6E7783',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {a.event}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data health */}
            <div className="glass-panel p-4">
              <div className="font-display font-medium mb-3 text-[11px] text-slate-200 tracking-[0.08em]">
                DATA HEALTH
              </div>
              {HEALTH.map((h) => (
                <div key={h.label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-slate-400" style={{ fontFamily: 'IBM Plex Sans' }}>
                      {h.label}
                    </span>
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: h.value === 100 ? '#4FB8AC' : '#C99A45' }}
                    >
                      {h.value}%
                    </span>
                  </div>
                  <div className="h-[3px] rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${h.value}%`,
                        background: h.value === 100 ? '#4FB8AC' : '#C99A45',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
            },
            {
              title: 'VALIDATE DATA',
              desc: 'Run topology and geometry validation.',
              screen: 'validation' as Screen,
              icon: <ShieldCheck size={14} />,
            },
            {
              title: 'EXPLORE 3D',
              desc: 'Open interactive 3D cadastral viewer.',
              screen: 'explorer' as Screen,
              icon: <Box size={14} />,
            },
            {
              title: 'SEARCH PROPERTY',
              desc: 'Find parcel, building, floor or unit.',
              screen: 'identifiers' as Screen,
              icon: <Activity size={14} />,
            },
          ].map((action, index) => (
            <motion.button
              key={action.title}
              onClick={() => onNav(action.screen)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="glass-panel p-6 text-left transition-colors hover:border-amber-400/40 cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-400/90">{action.icon}</span>
                <span className="font-display font-medium text-[10px] text-slate-200 tracking-[0.08em]">
                  {action.title}
                </span>
              </div>
              <p className="m-0 text-[10px] text-slate-400" style={{ fontFamily: 'IBM Plex Sans' }}>
                {action.desc}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
