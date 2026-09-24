import { Bell, Settings, ChevronDown, Menu } from 'lucide-react';
import type { Screen } from '../types';
import { useState } from 'react';
import MobileNavDrawer from './MobileNavDrawer';

const BREADCRUMBS: Record<Screen, string> = {
  dashboard: 'WORKSPACE / DASHBOARD',
  import: 'WORKSPACE / IMPORT DATA',
  explorer: 'WORKSPACE / 3D EXPLORER',
  records: 'RECORDS / PROPERTY RECORD',
  validation: 'ANALYSIS / VALIDATION',
  identifiers: 'ANALYSIS / SPATIAL IDENTIFIERS',
  'ai-review': 'ANALYSIS / AI REVIEW',
  audit: 'SYSTEM / AUDIT TRAIL',
  settings: 'SYSTEM / SETTINGS',
};

interface Props {
  screen: Screen;
  onNav: (s: Screen) => void;
  apiOnline: boolean;
}

export default function Topbar({ screen, onNav, apiOnline }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="flex items-center gap-3 px-4 h-14 shrink-0 border-b border-white/10" style={{ background: 'linear-gradient(180deg, #0d152e 0%, #0B132B 100%)' }}>
      {/* Left: mobile menu button + logo */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="lg:hidden shrink-0 rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div
          className="flex items-center gap-3 cursor-pointer min-w-0 group"
          onClick={() => onNav('dashboard')}
        >
          <div className="flex items-center justify-center font-display font-bold text-xs tracking-widest w-9 h-9 shrink-0 rounded-lg text-[#0B132B] transition-transform group-hover:scale-105" style={{ background: 'linear-gradient(135deg, var(--color-gold-300), var(--color-gold-600))', boxShadow: 'var(--shadow-gold)' }}>
            3D
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold leading-none text-[13px] text-white tracking-[0.04em] truncate">
              3D ULPIN
            </div>
            <div className="text-[8px] text-amber-200/60 leading-none mt-1 truncate tracking-[0.14em]">
              CADASTRAL GIS WORKSTATION
            </div>
          </div>
        </div>
      </div>

      {/* Center: breadcrumb */}
      <div className="hidden sm:flex flex-1 justify-center px-2 min-w-0">
        <span className="font-mono text-[10px] text-slate-400 tracking-[0.12em] truncate px-3 py-1 rounded-full border border-white/10 bg-white/[0.03]">
          {BREADCRUMBS[screen]}
        </span>
      </div>

      {/* Right: status + user */}
      <div className="flex items-center gap-3 sm:gap-4 justify-end shrink-0 ml-auto">
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="status-led online" />
            <span className="font-mono text-[9px] text-emerald-400 tracking-[0.08em]">
              DATABASE
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`status-led ${apiOnline ? 'online' : 'warning'}`} />
            <span
              className={`font-mono text-[9px] tracking-[0.08em] ${apiOnline ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {apiOnline ? 'API' : 'API OFFLINE'}
            </span>
          </div>
        </div>

        <div className="hidden md:block w-px h-5 bg-white/10" />

        <button
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-300 hover:bg-white/5 hover:text-white transition-colors min-w-0 max-w-[140px]"
          title="VINITH K"
        >
          <div className="flex items-center justify-center font-display font-semibold w-6 h-6 shrink-0 rounded-md text-[10px] text-[#0B132B]" style={{ background: 'linear-gradient(135deg, var(--color-gold-300), var(--color-gold-600))' }}>
            VK
          </div>
          <span className="hidden sm:inline truncate text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
            VINITH K
          </span>
          <ChevronDown size={10} className="shrink-0 text-slate-500" />
        </button>

        <button
          className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-200 shrink-0"
          onClick={() => onNav('settings')}
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>

        <button className="relative rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-200 shrink-0" aria-label="Notifications">
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-[5px] h-[5px] bg-amber-400 rounded-full" />
        </button>
      </div>
      <MobileNavDrawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        active={screen}
        onNav={onNav}
      />
    </header>
  );
}
