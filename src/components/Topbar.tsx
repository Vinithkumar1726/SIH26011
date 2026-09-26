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
    <header className="flex items-center gap-3 px-5 py-2 rounded-full bg-slate-900/60 backdrop-blur-xl border border-white/10 text-slate-200" style={{ boxShadow: '0 10px 30px -10px rgb(0 0 0 / 0.6)' }}>
      {/* Left: mobile menu button + logo */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          className="lg:hidden shrink-0 rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={16} />
        </button>
        <div
          className="flex items-center gap-2 cursor-pointer min-w-0"
          onClick={() => onNav('dashboard')}
        >
          <div className="flex items-center justify-center font-display font-bold text-[10px] tracking-widest w-7 h-7 shrink-0 rounded-full text-[#062026]" style={{ background: '#06B6D4', boxShadow: '0 0 12px rgba(6,182,212,0.5)' }}>
            AI
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="font-semibold leading-none text-[12px] text-cyan-400 tracking-widest truncate">
              CADASTRAL AI
            </div>
          </div>
        </div>
      </div>

      {/* Center: breadcrumb */}
      <div className="hidden md:block font-mono text-[9px] text-slate-400 tracking-[0.12em] truncate px-2">
        {BREADCRUMBS[screen]}
      </div>

      {/* Right: status + user */}
      <div className="flex items-center gap-2 justify-end shrink-0 ml-auto">
        <div className="hidden md:flex items-center gap-3 font-mono text-[9px] tracking-widest text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.9)' }} />API
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ boxShadow: '0 0 6px rgba(52,211,153,0.9)' }} />{apiOnline ? 'POSTGIS' : 'OFFLINE'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px rgba(34,211,238,0.9)' }} />MAP
          </span>
        </div>

        <button
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-slate-200 hover:bg-white/10 rounded-full min-w-0 max-w-[140px] transition-colors"
          title="VINITH K"
        >
          <span className="truncate text-[11px] font-semibold">VINITH K</span>
          <ChevronDown size={10} className="shrink-0 text-slate-500" />
        </button>

        <button
          className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white shrink-0 transition-colors"
          onClick={() => onNav('settings')}
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>

        <button className="relative rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white shrink-0 transition-colors" aria-label="Notifications">
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-[5px] h-[5px] bg-cyan-400 rounded-full" />
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
