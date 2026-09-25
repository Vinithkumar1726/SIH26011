import {
  LayoutDashboard, Upload, Box, FileText, ShieldCheck,
  Hash, Sparkles, ScrollText, Settings
} from 'lucide-react';
import type { Screen } from '../types';

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'WORKSPACE',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
      { id: 'import', label: 'Import Data', icon: <Upload size={15} /> },
      { id: 'explorer', label: '3D Explorer', icon: <Box size={15} /> },
      { id: 'records', label: 'Property Records', icon: <FileText size={15} /> },
    ],
  },
  {
    title: 'ANALYSIS',
    items: [
      { id: 'validation', label: 'Validation', icon: <ShieldCheck size={15} /> },
      { id: 'identifiers', label: 'Spatial Identifiers', icon: <Hash size={15} /> },
      { id: 'ai-review', label: 'AI Review', icon: <Sparkles size={15} /> },
    ],
  },
  {
    title: 'SYSTEM',
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
    <aside className="hidden lg:flex flex-col shrink-0 w-60 h-full px-0 py-0" style={{ background: '#111111', borderRight: '3px solid #000000' }}>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '2px solid var(--accent-primary)' }}>
        <div className="font-display font-bold text-white tracking-[0.06em]" style={{ fontSize: 17 }}>SIH26011</div>
        <div className="font-mono text-[9px] tracking-[0.18em]" style={{ color: 'var(--accent-primary)' }}>3D CADASTRAL SYSTEM</div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="px-2 mb-1.5 text-[9px] font-bold tracking-[0.18em] text-neutral-500">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className="relative w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all duration-100"
                  style={{
                    background: isActive ? 'var(--accent-primary)' : 'transparent',
                    color: isActive ? '#111111' : '#d4d4d4',
                    border: '2px solid transparent',
                    borderRadius: 0,
                    fontWeight: isActive ? 700 : 500,
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = '#222'; e.currentTarget.style.transform = 'translateX(3px)'; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; } }}
                >
                  <span className="flex shrink-0" style={{ color: isActive ? '#111111' : 'var(--accent-primary)' }}>
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
      <div className="px-4 py-3" style={{ borderTop: '2px solid var(--accent-primary)' }}>
        <div className="text-[9px] font-bold tracking-[0.18em] text-neutral-500 mb-2">
          SYSTEM STATUS
        </div>
        {[
          { label: 'POSTGIS 3D TOPOLOGY', status: 'ONLINE', tone: 'online' as const },
          { label: 'NASA SRTM ELEVATION', status: 'SYNCED', tone: 'online' as const },
          { label: 'YOLOv11-ONNX VISION', status: 'ACTIVE', tone: 'online' as const },
          { label: 'VERSION', status: 'vSIH26011 - SVAMITVA BUILD', tone: null },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-[9px] tracking-[0.08em] text-neutral-400 flex items-center gap-1.5">
              {row.tone && <span className={`status-led ${row.tone}`} />}
              {row.label}
            </span>
            <span
              className={`font-mono text-[9px] tracking-[0.08em] ${
                row.tone === null ? 'text-neutral-500' : row.tone === 'online' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
