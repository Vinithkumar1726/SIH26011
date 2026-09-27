import { Bell, Settings, ChevronDown, Menu, LogOut, User } from 'lucide-react';
import type { Screen } from '../types';
import { useState, useEffect, useRef } from 'react';
import MobileNavDrawer from './MobileNavDrawer';
import { StatusDot } from '../design/primitives';
import { useAuth } from '../auth';
import {
  BORDER, BORDER_THIN, DOMAIN, FONT, INK, MUTED, PAPER, SHADOW_SM, SURFACE,
} from '../design/tokens';

const BREADCRUMBS: Record<Screen, string> = {
  dashboard: 'WORKSPACE / DASHBOARD',
  import: 'WORKSPACE / IMPORT DATA',
  explorer: 'WORKSPACE / 3D EXPLORER',
  records: 'RECORDS / PROPERTY RECORD',
  'property-detail': 'RECORDS / PROPERTY DETAIL',
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <header
      className="flex items-center gap-3 px-4 py-2"
      style={{ background: SURFACE.panel, border: BORDER, boxShadow: SHADOW_SM }}
    >
      {/* Left: mobile menu button + logo */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          className="lg:hidden shrink-0"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
          style={{
            background: SURFACE.raised, color: PAPER, border: BORDER_THIN,
            padding: 6, cursor: 'pointer', display: 'flex',
          }}
        >
          <Menu size={16} />
        </button>
        <div
          className="flex items-center gap-2 cursor-pointer min-w-0"
          onClick={() => onNav('dashboard')}
        >
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              fontFamily: FONT.display, fontWeight: 700, fontSize: 10,
              letterSpacing: '0.1em', width: 28, height: 28,
              background: DOMAIN.record, color: INK, border: BORDER_THIN,
            }}
          >
            AI
          </div>
          <div className="min-w-0 hidden sm:block">
            <div
              className="truncate"
              style={{
                fontFamily: FONT.display, fontWeight: 700, fontSize: 12,
                color: PAPER, letterSpacing: '0.14em',
              }}
            >
              CADASTRAL AI
            </div>
          </div>
        </div>
      </div>

      {/* Center: breadcrumb */}
      <div
        className="hidden md:block truncate px-2"
        style={{ fontFamily: FONT.mono, fontSize: 9, color: MUTED, letterSpacing: '0.12em' }}
      >
        {BREADCRUMBS[screen]}
      </div>

      {/* Right: status + user */}
      <div className="flex items-center gap-2 justify-end shrink-0 ml-auto">
        <div
          className="hidden md:flex items-center gap-3"
          style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.12em', color: MUTED }}
        >
          <span className="flex items-center gap-1.5">
            <StatusDot domain="ok" size={8} />API
          </span>
          <span className="flex items-center gap-1.5">
            <StatusDot domain={apiOnline ? 'ok' : 'conflict'} size={8} />
            {apiOnline ? 'POSTGIS' : 'OFFLINE'}
          </span>
          <span className="flex items-center gap-1.5">
            <StatusDot domain="spatial" size={8} />MAP
          </span>
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 min-w-0"
            title={user?.username || 'User'}
            style={{
              background: 'transparent', border: '2px solid transparent',
              color: PAPER, cursor: 'pointer', maxWidth: 180,
            }}
          >
            <User size={12} className="shrink-0" style={{ color: MUTED }} />
            <span className="truncate" style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>
              {user?.username || 'VINITH K'}
            </span>
            <ChevronDown size={10} className="shrink-0" style={{ color: MUTED }} />
          </button>

          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 min-w-[180px] z-50"
            >
              <div style={{ background: SURFACE.panel, border: BORDER, boxShadow: SHADOW_SM, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: BORDER_THIN }}>
                  <div style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT.body, color: PAPER }}>
                    {user?.username || 'VINITH K'}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: FONT.mono, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {user?.role || 'SURVEYOR'}
                  </div>
                </div>
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', background: 'transparent', border: 'none',
                    color: PAPER, cursor: 'pointer', fontSize: 11, fontFamily: FONT.body,
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = SURFACE.raised}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={12} />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <button
          onClick={() => onNav('settings')}
          aria-label="Settings"
          style={{
            background: SURFACE.raised, color: PAPER, border: BORDER_THIN,
            padding: 6, cursor: 'pointer', display: 'flex',
          }}
        >
          <Settings size={14} />
        </button>

        <button
          aria-label="Notifications"
          style={{
            position: 'relative', background: SURFACE.raised, color: PAPER,
            border: BORDER_THIN, padding: 6, cursor: 'pointer', display: 'flex',
          }}
        >
          <Bell size={14} />
          <span
            style={{
              position: 'absolute', top: 2, right: 2, width: 7, height: 7,
              background: DOMAIN.spatial, border: `1px solid ${INK}`,
            }}
          />
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
