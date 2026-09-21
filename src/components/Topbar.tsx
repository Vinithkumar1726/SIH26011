import { Bell, Settings, ChevronDown, Database, Wifi, Menu } from 'lucide-react';
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
    <header
      className="topbar"
      style={{ height: 56 }}
    >
      {/* Left: logo + mobile menu button */}
      <div className="flex items-center gap-3 lg:flex-1">
        <button
          className="btn-ghost p-2 lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
          style={{ padding: 8 }}
        >
          <Menu size={20} style={{ color: 'var(--color-text-primary)' }} />
        </button>
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onNav('dashboard')}
        >
          <div
            className="flex items-center justify-center font-display font-bold text-xs tracking-widest"
            style={{
              width: 36,
              height: 36,
              background: 'var(--color-primary)',
              border: '1px solid var(--color-accent)',
              color: 'var(--color-accent)',
              borderRadius: 3,
              letterSpacing: '0.06em',
            }}
          >
            3D
          </div>
          <div>
            <div
              className="font-display font-semibold leading-none"
              style={{ fontSize: 13, color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}
            >
              3D ULPIN
            </div>
            <div
              className="label-xs leading-none mt-0.5"
              style={{ fontSize: 8 }}
            >
              CADASTRAL GIS WORKSTATION
            </div>
          </div>
        </div>
      </div>

      {/* Center: breadcrumb */}
      <div
        className="font-mono text-center lg:flex-1"
        style={{ fontSize: 10, color: 'var(--color-text-quaternary)', letterSpacing: '0.1em' }}
      >
        {BREADCRUMBS[screen]}
      </div>

      {/* Right: status + user */}
      <div className="flex items-center gap-4 lg:flex-1 justify-end">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="status-led online" />
            <span
              className="font-mono"
              style={{ fontSize: 9, color: 'var(--color-success)', letterSpacing: '0.08em' }}
            >
              DATABASE
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`status-led ${apiOnline ? 'online' : 'warning'}`} />
            <span
              className="font-mono"
              style={{ fontSize: 9, color: apiOnline ? 'var(--color-success)' : 'var(--color-warning)', letterSpacing: '0.08em' }}
            >
              {apiOnline ? 'API' : 'API OFFLINE'}
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--color-border-primary)' }} />

        <button
          className="flex items-center gap-1.5 btn-ghost"
          style={{ padding: '4px 8px' }}
        >
          <div
            className="flex items-center justify-center font-display font-semibold"
            style={{
              width: 24,
              height: 24,
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 2,
              fontSize: 10,
              color: 'var(--color-accent)',
            }}
          >
            VK
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
            VINITH K
          </span>
          <ChevronDown size={10} style={{ color: 'var(--color-text-quaternary)' }} />
        </button>

        <button
          className="btn-ghost"
          style={{ padding: 6 }}
          onClick={() => onNav('settings')}
        >
          <Settings size={14} style={{ color: 'var(--color-text-quaternary)' }} />
        </button>

        <button className="btn-ghost relative" style={{ padding: 6 }}>
          <Bell size={14} style={{ color: 'var(--color-text-quaternary)' }} />
          <span
            className="absolute top-1 right-1"
            style={{
              width: 5,
              height: 5,
              background: 'var(--color-accent)',
              borderRadius: '50%',
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