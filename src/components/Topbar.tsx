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
    <header className="flex items-center gap-3 px-4 shrink-0" style={{ height: 56, background: '#FFFFFF', borderBottom: '3px solid #111111' }}>
      {/* Left: mobile menu button + logo */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="lg:hidden shrink-0 p-2 text-[#111] hover:bg-[#F5C400]"
          style={{ border: '2px solid #111111' }}
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={18} strokeWidth={2.5} />
        </button>
        <div
          className="flex items-center gap-2 cursor-pointer min-w-0"
          onClick={() => onNav('dashboard')}
        >
          <div className="flex items-center justify-center font-display font-bold text-xs tracking-widest w-9 h-9 shrink-0 text-[#111]" style={{ background: 'var(--accent-primary)', border: '2px solid #111111', boxShadow: '3px 3px 0 #111111' }}>
            SIH
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold leading-none text-[14px] text-[#111] tracking-[0.02em] truncate">
              SIH26011
            </div>
            <div className="font-mono text-[8px] text-[#555] leading-none mt-1 truncate tracking-[0.14em]">
              3D CADASTRAL COMMAND
            </div>
          </div>
        </div>
      </div>

      {/* Center: breadcrumb */}
      <nav aria-label="Breadcrumb" className="hidden sm:flex flex-1 justify-center px-2 min-w-0">
        <span className="font-mono text-[10px] text-[#111] tracking-[0.12em] truncate px-3 py-1" style={{ border: '2px solid #111111', background: '#F4F1E8' }}>
          {BREADCRUMBS[screen]}
        </span>
      </nav>

      {/* Right: status + user */}
      <div className="flex items-center gap-2 justify-end shrink-0 ml-auto">
        <div className="hidden md:flex items-center gap-2">
          <span className="brutal-badge brutal-badge-green" style={{ borderRadius: 0 }}>
            <span className="status-led online" />API
          </span>
          <span className={`brutal-badge ${apiOnline ? 'brutal-badge-green' : 'brutal-badge-red'}`} style={{ borderRadius: 0 }}>
            <span className={`status-led ${apiOnline ? 'online' : 'error'}`} />{apiOnline ? 'POSTGIS' : 'OFFLINE'}
          </span>
          <span className="brutal-badge" style={{ borderRadius: 0 }}>
            <span className="status-led online" />MAP
          </span>
        </div>

        <button
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-[#111] hover:bg-[#F5C400] min-w-0 max-w-[140px]"
          style={{ border: '2px solid #111111' }}
          title="VINITH K"
        >
          <span className="truncate text-[11px] font-bold">VINITH K</span>
          <ChevronDown size={10} className="shrink-0" />
        </button>

        <button
          className="p-1.5 text-[#111] hover:bg-[#F5C400] shrink-0"
          style={{ border: '2px solid #111111' }}
          onClick={() => onNav('settings')}
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>

        <button className="relative p-1.5 text-[#111] hover:bg-[#F5C400] shrink-0" style={{ border: '2px solid #111111' }} aria-label="Notifications">
          <Bell size={14} />
          <span className="absolute top-0.5 right-0.5 w-[7px] h-[7px] bg-[#D92D20] rounded-none border border-[#111]" />
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
