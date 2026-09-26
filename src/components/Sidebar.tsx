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
    <aside className="hidden lg:flex flex-col shrink-0 w-60 h-full px-3 py-3 bg-slate-900/60 backdrop-blur-xl border-r border-white/10">
      <div className="px-2 pt-1 pb-3 mb-2 border-b border-white/10">
        <div className="font-display font-bold text-slate-100 tracking-[0.06em]" style={{ fontSize: 17 }}>SIH26011</div>
        <div className="font-mono text-[9px] tracking-[0.18em] text-cyan-300/80">3D CADASTRAL SYSTEM</div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="px-2 mb-1.5 text-[9px] font-semibold tracking-[0.18em] text-slate-500">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 font-semibold'
                      : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  <span className={`flex shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-500'}`}>
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
      <div className="px-2 py-3 border-t border-white/10">
        <div className="text-[9px] font-semibold tracking-[0.18em] text-slate-500 mb-2">
          SYSTEM STATUS
        </div>
        {[
          { label: 'POSTGIS 3D TOPOLOGY', status: 'ONLINE', tone: 'online' as const },
          { label: 'NASA SRTM ELEVATION', status: 'SYNCED', tone: 'online' as const },
          { label: 'YOLOv11-ONNX VISION', status: 'ACTIVE', tone: 'online' as const },
          { label: 'VERSION', status: 'vSIH26011 - SVAMITVA BUILD', tone: null },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-[9px] tracking-[0.08em] text-slate-500 flex items-center gap-1.5">
              {row.tone && <span className={`status-led ${row.tone}`} />}
              {row.label}
            </span>
            <span
              className={`font-mono text-[9px] tracking-[0.08em] ${
                row.tone === null ? 'text-slate-500' : row.tone === 'online' ? 'text-emerald-400' : 'text-red-400'
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
