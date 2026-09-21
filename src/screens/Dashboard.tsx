import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Box, MapPin, Building2, Layers, ShieldCheck, ChevronRight, Activity, ArrowUpRight } from 'lucide-react';
import type { Screen } from '../types';
import { api, type DashboardStats } from '../api';

interface Props {
  onNav: (s: Screen) => void;
}

const KPI_CARDS = [
  { label: 'PARCELS', value: '01', sub: 'REGISTERED', icon: <MapPin size={12} />, color: '#C99A45', trend: '+1 this session' },
  { label: 'BUILDINGS', value: '01', sub: 'MAPPED', icon: <Building2 size={12} />, color: '#4FB8AC', trend: '3 floors' },
  { label: 'PROPERTY UNITS', value: '04', sub: '3D REGISTERED', icon: <Layers size={12} />, color: '#C99A45', trend: 'V01 · all floors' },
  { label: 'VALIDATION', value: '100%', sub: 'PASS RATE', icon: <ShieldCheck size={12} />, color: '#4FB8AC', trend: '18/18 checks' },
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
    { label: 'PARCELS', value: String(stats.total_parcels).padStart(2, '0'), sub: 'REGISTERED', icon: <MapPin size={12} />, color: '#C99A45', trend: 'LIVE API' },
    { label: 'BUILDINGS', value: String(stats.total_buildings).padStart(2, '0'), sub: 'MAPPED', icon: <Building2 size={12} />, color: '#4FB8AC', trend: `${stats.total_floors} floors` },
    { label: 'PROPERTY UNITS', value: String(stats.total_units).padStart(2, '0'), sub: '3D REGISTERED', icon: <Layers size={12} />, color: '#C99A45', trend: `${stats.total_3d_units} solids` },
    { label: 'VALIDATION', value: stats.total_units ? `${Math.round((stats.validated_units / stats.total_units) * 100)}%` : '—', sub: 'PASS RATE', icon: <ShieldCheck size={12} />, color: '#4FB8AC', trend: `${stats.conflicts} conflicts` },
  ] : KPI_CARDS;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-bg-secondary)' }}>
      {/* Header */}
      <div
        className="flex items-start justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-primary)' }}
      >
        <div>
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 18, color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}
          >
            CADASTRAL OVERVIEW
          </h1>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, fontFamily: 'IBM Plex Sans' }}>
            3D land administration and volumetric property intelligence
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => onNav('import')}>
            IMPORT DATA
          </button>
          <button className="btn-primary" onClick={() => onNav('explorer')}>
            OPEN 3D EXPLORER
          </button>
        </div>
      </div>

      <section id="hero-particle-container" aria-label="3D Particle Visualization" style={{
        background: 'var(--color-hero-bg)',
        borderBottom: '1px solid var(--color-hero-border)',
        padding: '48px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="font-display font-semibold" style={{ fontSize: 'clamp(18px, 3vw, 24px)', color: 'var(--color-hero-accent)', letterSpacing: '0.04em', marginBottom: '12px' }}>
            3D CADASTRAL VISUALIZATION
          </h2>
          <p style={{ fontSize: 'clamp(12px, 1.5vw, 14px)', color: 'var(--color-hero-text-muted)', maxWidth: '600px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Interactive 3D particle visualization of cadastral data streams. Real-time volumetric rendering with WebGL.
          </p>
          <div style={{ fontSize: '11px', color: 'var(--color-hero-text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(var(--color-hero-accent-rgb), 0.1)', border: '1px solid var(--color-hero-accent)', borderRadius: 'var(--radius-sm)' }}>
            <span>●</span>
            <span>Particle effect container — populated separately</span>
          </div>
        </div>
      </section>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              style={{
                background: '#10151C',
                border: '1px solid #28313C',
                borderRadius: 3,
                borderTop: `2px solid ${card.color}`,
                padding: '14px 16px',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    color: '#6E7783',
                    fontFamily: 'IBM Plex Sans',
                  }}
                >
                  {card.label}
                </span>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <div
                className="font-display font-semibold"
                style={{ fontSize: 28, color: '#F1F3F5', lineHeight: 1 }}
              >
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    color: card.color,
                    fontFamily: 'IBM Plex Sans',
                  }}
                >
                  {card.sub}
                </span>
                <span style={{ fontSize: 9, color: '#6E7783', fontFamily: 'IBM Plex Mono' }}>
                  {card.trend}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main area */}
        <div className="flex gap-4" style={{ flex: 1, minHeight: 0 }}>
          {/* 3D Preview */}
          <div
            style={{
              flex: '1 1 60%',
              background: '#10151C',
              border: '1px solid #28313C',
              borderRadius: 3,
              overflow: 'hidden',
              minHeight: 280,
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{ borderBottom: '1px solid #28313C' }}
            >
              <div />
              <button
                className="btn-ghost"
                style={{ fontSize: 10 }}
                onClick={() => onNav('explorer')}
              >
                OPEN EXPLORER <ChevronRight size={10} style={{ display: 'inline' }} />
              </button>
            </div>
            <div
              className="blueprint-bg"
              style={{ height: 'calc(100% - 37px)', padding: 16 }}
            >
              <IsoBuildingPreview />
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-3" style={{ flex: '0 0 280px' }}>
            {/* Activity */}
            <div
              style={{
                background: '#10151C',
                border: '1px solid #28313C',
                borderRadius: 3,
                flex: '1 1 50%',
                overflow: 'hidden',
              }}
            >
              <div
                className="px-4 py-2"
                style={{ borderBottom: '1px solid #28313C' }}
              >
                <span
                  className="font-display font-medium"
                  style={{ fontSize: 11, color: '#F1F3F5', letterSpacing: '0.08em' }}
                >
                  SYSTEM ACTIVITY
                </span>
              </div>
              <div className="px-4 py-3">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="flex gap-3 items-start mb-2.5">
                    <span
                      className="font-mono"
                      style={{ fontSize: 9, color: '#6E7783', letterSpacing: '0.04em', minWidth: 38 }}
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
            <div
              style={{
                background: '#10151C',
                border: '1px solid #28313C',
                borderRadius: 3,
                padding: 16,
              }}
            >
              <div
                className="font-display font-medium mb-3"
                style={{ fontSize: 11, color: '#F1F3F5', letterSpacing: '0.08em' }}
              >
                DATA HEALTH
              </div>
              {HEALTH.map((h) => (
                <div key={h.label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 10, color: '#A8B0BA', fontFamily: 'IBM Plex Sans' }}>
                      {h.label}
                    </span>
                    <span
                      className="font-mono"
                      style={{ fontSize: 10, color: h.value === 100 ? '#4FB8AC' : '#C99A45' }}
                    >
                      {h.value}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="fill"
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
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
              className="text-left transition-colors"
              style={{
                background: '#10151C',
                border: '1px solid #28313C',
                borderRadius: 3,
                padding: '12px 14px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#C99A45')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = '#28313C')
              }
              whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: '#C99A45' }}>{action.icon}</span>
                <span
                  className="font-display font-medium"
                  style={{ fontSize: 10, color: '#F1F3F5', letterSpacing: '0.08em' }}
                >
                  {action.title}
                </span>
              </div>
              <p style={{ fontSize: 10, color: '#6E7783', fontFamily: 'IBM Plex Sans', margin: 0 }}>
                {action.desc}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
