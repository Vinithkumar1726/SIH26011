import {
  LayoutDashboard, Upload, Box, FileText, ShieldCheck,
  Hash, Sparkles, ScrollText, Settings, Circle
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
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={13} /> },
      { id: 'import', label: 'Import Data', icon: <Upload size={13} /> },
      { id: 'explorer', label: '3D Explorer', icon: <Box size={13} /> },
      { id: 'records', label: 'Property Records', icon: <FileText size={13} /> },
    ],
  },
  {
    title: 'ANALYSIS',
    items: [
      { id: 'validation', label: 'Validation', icon: <ShieldCheck size={13} /> },
      { id: 'identifiers', label: 'Spatial Identifiers', icon: <Hash size={13} /> },
      { id: 'ai-review', label: 'AI Review', icon: <Sparkles size={13} /> },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'audit', label: 'Audit Trail', icon: <ScrollText size={13} /> },
      { id: 'settings', label: 'Settings', icon: <Settings size={13} /> },
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
      className="flex flex-col shrink-0"
      style={{
        width: 240,
        background: 'var(--color-bg-surface)',
        borderRight: '1px solid var(--color-border-secondary)',
        height: '100%',
      }}
    >
      <div className="flex-1 overflow-y-auto py-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <div
              className="px-4 mb-1"
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: 'var(--color-text-quaternary)',
                fontFamily: 'var(--font-body)',
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
                  className="sidebar-item"
                  style={{
                    borderLeftColor: isActive ? 'var(--color-accent)' : 'transparent',
                    background: isActive ? 'var(--color-primary-bg)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  <span style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-quaternary)' }}>
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
      <div
        className="px-4 py-4"
        style={{ borderTop: '1px solid var(--color-border-secondary)' }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: 'var(--color-text-quaternary)',
            fontFamily: 'var(--font-body)',
            marginBottom: 8,
          }}
        >
          SYSTEM STATUS
        </div>
        {[
          { label: 'DATABASE', status: 'ONLINE', ok: true },
          { label: 'GIS ENGINE', status: 'READY', ok: true },
          { label: '3D ENGINE', status: 'READY', ok: true },
          { label: 'VERSION', status: '2.4.1', ok: null },
        ].map((row) => (
          <div
            key={row.label}
            className="flex justify-between items-center"
            style={{ marginBottom: 4 }}
          >
            <span
              className="font-mono"
              style={{ fontSize: 9, color: 'var(--color-text-quaternary)', letterSpacing: '0.08em' }}
            >
              {row.label}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.08em',
                color: row.ok === null ? 'var(--color-text-quaternary)' : row.ok ? 'var(--color-success)' : 'var(--color-error)',
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
