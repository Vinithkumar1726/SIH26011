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
    <aside className="hidden lg:flex flex-col shrink-0 w-60 h-full bg-slate-950 px-3 py-4">
      <div className="flex-1 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="px-4 mb-1.5 text-[9px] font-semibold tracking-[0.12em] text-slate-500">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] transition-colors ${
                    isActive
                      ? 'bg-emerald-400/10 text-emerald-400 font-medium'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className={`flex shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
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
      <div className="px-4 py-4 border-t border-white/10">
        <div className="text-[9px] font-semibold tracking-[0.12em] text-slate-500 mb-2">
          SYSTEM STATUS
        </div>
        {[
          { label: 'DATABASE', status: 'ONLINE', ok: true },
          { label: 'GIS ENGINE', status: 'READY', ok: true },
          { label: '3D ENGINE', status: 'READY', ok: true },
          { label: 'VERSION', status: '2.4.1', ok: null },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center mb-1">
            <span className="font-mono text-[9px] tracking-[0.08em] text-slate-500">
              {row.label}
            </span>
            <span
              className={`font-mono text-[9px] tracking-[0.08em] ${
                row.ok === null ? 'text-slate-500' : row.ok ? 'text-emerald-400' : 'text-red-400'
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
