import {
  LayoutDashboard, Upload, Box, FileText, ShieldCheck,
  Hash, Sparkles, ScrollText, Settings
} from 'lucide-react';
import type { Screen } from '../types';
import { StatusDot } from '../design/primitives';
import {
  BORDER_THIN, DOMAIN, FONT, INK, MUTED, PAPER, SURFACE, onDomain, type DomainKey,
} from '../design/tokens';

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: { title: string; accent: DomainKey; items: NavItem[] }[] = [
  {
    title: 'WORKSPACE',
    accent: 'spatial',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
      { id: 'import', label: 'Import Data', icon: <Upload size={15} /> },
      { id: 'explorer', label: '3D Explorer', icon: <Box size={15} /> },
      { id: 'records', label: 'Property Records', icon: <FileText size={15} /> },
    ],
  },
  {
    title: 'ANALYSIS',
    accent: 'ai',
    items: [
      { id: 'validation', label: 'Validation', icon: <ShieldCheck size={15} /> },
      { id: 'identifiers', label: 'Spatial Identifiers', icon: <Hash size={15} /> },
      { id: 'ai-review', label: 'AI Review', icon: <Sparkles size={15} /> },
    ],
  },
  {
    title: 'SYSTEM',
    accent: 'temporal',
    items: [
      { id: 'audit', label: 'Audit Trail', icon: <ScrollText size={15} /> },
      { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
    ],
  },
];

interface Props {
  active: Screen;
  onNav: (s: Screen) => void;
}

export default function Sidebar({ active, onNav }: Props) {
  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 w-60 h-full"
      style={{ background: SURFACE.panel, borderRight: `3px solid ${INK}`, padding: '12px 0' }}
    >
      <div style={{ padding: '4px 16px 12px', borderBottom: `2px solid ${INK}` }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, color: PAPER, letterSpacing: '0.06em', fontSize: 17 }}>
          SIH26011
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.18em', color: DOMAIN.record }}>
          3D CADASTRAL SYSTEM
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ padding: '12px 12px 0' }}>
        {SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: 16 }}>
            <div
              style={{
                padding: '0 8px',
                marginBottom: 6,
                fontFamily: FONT.mono,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: DOMAIN[section.accent],
              }}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2"
                  style={{
                    background: isActive ? DOMAIN[section.accent] : 'transparent',
                    color: isActive ? onDomain(section.accent) : MUTED,
                    border: isActive ? BORDER_THIN : '2px solid transparent',
                    boxShadow: isActive ? '3px 3px 0 #000000' : 'none',
                    fontFamily: FONT.body,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    marginBottom: 2,
                  }}
                >
                  <span className="flex shrink-0" style={{ color: isActive ? onDomain(section.accent) : DOMAIN[section.accent] }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* System status footer */}
      <div style={{ padding: '12px 16px 4px', borderTop: `2px solid ${INK}` }}>
        <div
          style={{
            fontFamily: FONT.mono, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.18em', color: MUTED, marginBottom: 8,
          }}
        >
          SYSTEM STATUS
        </div>
        {[
          { label: 'POSTGIS 3D TOPOLOGY', status: 'ONLINE', domain: 'ok' as DomainKey },
          { label: 'NASA SRTM ELEVATION', status: 'SYNCED', domain: 'ok' as DomainKey },
          { label: 'YOLOv11-ONNX VISION', status: 'ACTIVE', domain: 'ai' as DomainKey },
          { label: 'VERSION', status: 'vSIH26011 - SVAMITVA BUILD', domain: null },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center" style={{ marginBottom: 6 }}>
            <span
              className="flex items-center gap-1.5"
              style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.08em', color: MUTED }}
            >
              {row.domain && <StatusDot domain={row.domain} size={8} />}
              {row.label}
            </span>
            <span
              style={{
                fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.08em',
                color: row.domain ? DOMAIN[row.domain] : MUTED, fontWeight: 700,
              }}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
