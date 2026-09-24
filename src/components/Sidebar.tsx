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
    <aside className="hidden lg:flex flex-col shrink-0 w-60 h-full px-3 py-4" style={{ background: 'linear-gradient(180deg, #0B132B 0%, #111c38 60%, #0B132B 100%)', borderRight: '1px solid rgb(201 154 69 / 0.18)' }}>
      <div className="flex-1 overflow-y-auto">
        {SECTIONS.map((section, si) => (
          <div key={section.title} className={`mb-5 fade-up stagger-${Math.min(si + 1, 3)}`}>
            <div className="px-4 mb-1.5 text-[9px] font-semibold tracking-[0.16em] text-slate-500">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  className={`relative w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] transition-all duration-150 ${
                    isActive
                      ? 'bg-white/[0.07] text-amber-200 font-medium shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:translate-x-0.5'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: 'linear-gradient(180deg, var(--color-gold-400), var(--color-gold-600))' }} />
                  )}
                  <span className={`flex shrink-0 transition-colors ${isActive ? 'text-amber-300' : 'text-slate-500'}`}>
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
        <div className="text-[9px] font-semibold tracking-[0.16em] text-slate-500 mb-2">
          SYSTEM STATUS
        </div>
        {[
          { label: 'DATABASE', status: 'ONLINE', tone: 'online' as const },
          { label: 'GIS ENGINE', status: 'READY', tone: 'online' as const },
          { label: '3D ENGINE', status: 'READY', tone: 'online' as const },
          { label: 'VERSION', status: '2.4.1', tone: null },
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
