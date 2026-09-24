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
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#111111" strokeOpacity="0.12" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="420" height="320" fill="#FFFFFF" />
      <rect width="420" height="320" fill="url(#bgGrid)" />

      {/* Parcel boundary */}
      <polygon points="60,260 210,190 360,260 210,330" fill="none" stroke="#111111" strokeWidth="2" strokeDasharray="6,3" />
      <text x="210" y="345" fill="#111111" fontSize="8" fontWeight="700" textAnchor="middle" letterSpacing="1">ULPIN: 29384756102934</text>

      {/* Floor 1 */}
      <polygon points="90,230 210,162 330,230 210,298" fill="#F4F1E8" stroke="#111111" strokeWidth="1.5" />
      <polygon points="90,230 90,206 210,138 210,162" fill="#E4DFD2" stroke="#111111" strokeWidth="1.5" />
      <polygon points="330,230 330,206 210,138 210,162" fill="#FFFFFF" stroke="#111111" strokeWidth="1.5" />
      {/* F1 units */}
      <line x1="150" y1="246" x2="150" y2="178" stroke="#111111" strokeWidth="1" />
      <text x="125" y="222" fill="#111111" fontSize="7" fontWeight="700" letterSpacing="1">U01</text>
      <text x="220" y="222" fill="#111111" fontSize="7" fontWeight="700" letterSpacing="1">U02</text>

      {/* Floor 2 */}
      <polygon points="90,206 210,138 330,206 210,274" fill="#F4F1E8" stroke="#111111" strokeWidth="1.5" />
      <polygon points="90,206 90,182 210,114 210,138" fill="#E4DFD2" stroke="#111111" strokeWidth="1.5" />
      <polygon points="330,206 330,182 210,114 210,138" fill="#FFFFFF" stroke="#111111" strokeWidth="1.5" />
      <line x1="150" y1="222" x2="150" y2="154" stroke="#111111" strokeWidth="1" />
      <text x="125" y="198" fill="#111111" fontSize="7" fontWeight="700" letterSpacing="1">U03</text>
      <text x="220" y="198" fill="#111111" fontSize="7" fontWeight="700" letterSpacing="1">U04</text>

      {/* Floor 3 */}
      <polygon points="100,182 210,118 320,182 210,246" fill="#F5C400" stroke="#111111" strokeWidth="2" />
      <polygon points="100,182 100,158 210,94 210,118" fill="#E0A800" stroke="#111111" strokeWidth="2" />
      <polygon points="320,182 320,158 210,94 210,118" fill="#FFD23F" stroke="#111111" strokeWidth="2" />

      {/* Elevation markers */}
      <line x1="40" y1="258" x2="56" y2="258" stroke="#555555" strokeWidth="1" />
      <line x1="40" y1="234" x2="56" y2="234" stroke="#555555" strokeWidth="1" />
      <line x1="40" y1="210" x2="56" y2="210" stroke="#555555" strokeWidth="1" />
      <line x1="40" y1="186" x2="56" y2="186" stroke="#555555" strokeWidth="1" />
      <line x1="40" y1="258" x2="40" y2="186" stroke="#555555" strokeWidth="1" />
      <text x="36" y="261" fill="#555555" fontSize="7" textAnchor="end">+0.00</text>
      <text x="36" y="237" fill="#555555" fontSize="7" textAnchor="end">+3.20</text>
      <text x="36" y="213" fill="#555555" fontSize="7" textAnchor="end">+6.40</text>
      <text x="36" y="189" fill="#555555" fontSize="7" textAnchor="end">+9.60</text>
      <text x="38" y="175" fill="#555555" fontSize="7" textAnchor="end">M</text>

      {/* Selected unit highlight */}
      <polygon points="90,230 150,198 150,174 90,206" fill="#F5C400" fillOpacity="0.45" stroke="#111111" strokeWidth="2" />
      <text x="105" y="215" fill="#111111" fontSize="8" fontWeight="700" letterSpacing="1">U01</text>

      {/* Labels */}
      <text x="210" y="86" fill="#111111" fontSize="10" fontWeight="700" textAnchor="middle" letterSpacing="2">BUILDING B01</text>
      <text x="210" y="97" fill="#555555" fontSize="7" textAnchor="middle" letterSpacing="1">3 FLOORS · 4 UNITS</text>
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
    <div className="flex flex-col h-full min-w-0 overflow-hidden" style={{ background: '#F4F1E8' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 py-5 shrink-0" style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}>
        <div className="min-w-0">
          <div className="brutal-eyebrow" style={{ marginBottom: 2 }}>COMMAND OVERVIEW</div>
          <h1 className="font-display font-bold text-xl text-[#111] tracking-[0.01em]">
            CADASTRAL OVERVIEW
          </h1>
          <p className="mt-1 text-[11px]" style={{ color: '#555' }}>
            3D land administration and volumetric property intelligence
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onNav('import')} className="brutal-btn">
            IMPORT DATA
          </button>
          <button onClick={() => onNav('explorer')} className="brutal-btn brutal-btn-gold">
            OPEN 3D EXPLORER
          </button>
        </div>
      </div>

      <section id="hero-particle-container" aria-label="3D Particle Visualization" className="mx-6 mb-2 px-6 py-8 text-center shrink-0 brutal-panel" style={{ borderTop: '6px solid #F5C400' }}>
        <div className="brutal-eyebrow" style={{ marginBottom: 6 }}>LIVE REGISTRY · COIMBATORE TILE</div>
        <h2 className="font-display font-bold text-[#111] tracking-[0.01em] mb-3" style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>
          3D CADASTRAL VISUALIZATION
        </h2>
        <p className="mx-auto mb-5 max-w-[600px]" style={{ fontSize: 'clamp(12px, 1.5vw, 14px)', lineHeight: 1.6, color: '#555' }}>
          Interactive 3D particle visualization of cadastral data streams. Real-time volumetric rendering with WebGL.
        </p>
        <div className="brutal-badge brutal-badge-gold">
          <span className="status-led online" />
          <span>Particle effect container — populated separately</span>
        </div>
      </section>

      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-5 md:p-6 flex flex-col gap-6">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: index * 0.04 }}
              className="brutal-panel"
              style={{ padding: 16, borderTop: `6px solid ${card.color === '#4FB8AC' ? '#16A34A' : '#F5C400'}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="brutal-eyebrow">
                  {card.label}
                </span>
                <span className="brutal-badge" style={{ fontSize: 8 }}>{card.sub}</span>
              </div>
              <div className="brutal-metric-num">
                {card.value}
              </div>
              <div className="font-mono text-[10px] mt-2" style={{ color: '#555' }}>
                {card.trend}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main area */}
        <div className="flex flex-col xl:flex-row gap-6 min-w-0">
          {/* 3D Preview */}
          <div className="brutal-panel min-w-0 flex-1" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="brutal-header">
              <span className="brutal-title">3D Preview</span>
              <button
                className="brutal-btn brutal-btn-gold"
                style={{ fontSize: 9, padding: '4px 10px' }}
                onClick={() => onNav('explorer')}
              >
                OPEN EXPLORER →
              </button>
            </div>
            <div className="blueprint-bg min-h-[280px] p-4" style={{ height: 320, background: '#fff' }}>
              <IsoBuildingPreview />
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-6 w-full xl:w-72 shrink-0 min-w-0">
            {/* Activity */}
            <div className="brutal-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="brutal-header">
                <span className="brutal-title">System Activity</span>
              </div>
              <div className="px-4 py-3 relative">
                <span className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-[#111]" aria-hidden />
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="relative flex gap-3 items-start mb-2.5 pl-1">
                    <span
                      className="relative z-10 mt-1 shrink-0"
                      style={{ width: 9, height: 9, background: a.ok === true ? '#16A34A' : a.ok === false ? '#D92D20' : '#6B7280', border: '2px solid #111' }}
                    />
                    <span
                      className="font-mono"
                      style={{ fontSize: 9, color: '#555', letterSpacing: '0.04em', minWidth: 38 }}
                    >
                      {a.time}
                    </span>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        color: '#111',
                        fontWeight: 700,
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
            <div className="brutal-panel p-4">
              <div className="brutal-title mb-3">
                DATA HEALTH
              </div>
              {HEALTH.map((h) => (
                <div key={h.label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-bold" style={{ fontFamily: 'IBM Plex Sans', color: '#111' }}>
                      {h.label}
                    </span>
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{ color: h.value === 100 ? '#16A34A' : '#B45309' }}
                    >
                      {h.value}%
                    </span>
                  </div>
                  <div style={{ height: 12, border: '2px solid #111', background: '#fff' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${h.value}%`,
                        background: h.value === 100 ? '#16A34A' : '#F5C400',
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: index * 0.04 }}
              whileTap={{ scale: 0.98 }}
              className="brutal-panel text-left"
              style={{ padding: 16, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '7px 7px 0 #111111'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '5px 5px 0 #111111'; }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: '#111111', background: '#F5C400', border: '2px solid #111111', padding: 3, display: 'inline-flex' }}>{action.icon}</span>
                <span className="font-display font-bold text-[11px] text-[#111] tracking-[0.06em]">
                  {action.title} →
                </span>
              </div>
              <p className="m-0 text-[11px]" style={{ color: '#555' }}>
                {action.desc}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
