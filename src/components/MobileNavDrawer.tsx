import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutDashboard, Upload, Box, FileText, ShieldCheck, Hash, Sparkles, ScrollText, Settings, Circle } from 'lucide-react';
import type { Screen } from '../types';

const SECTIONS = [
  {
    title: 'WORKSPACE',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      { id: 'import', label: 'Import Data', icon: <Upload size={16} /> },
      { id: 'explorer', label: '3D Explorer', icon: <Box size={16} /> },
      { id: 'records', label: 'Property Records', icon: <FileText size={16} /> },
    ],
  },
  {
    title: 'ANALYSIS',
    items: [
      { id: 'validation', label: 'Validation', icon: <ShieldCheck size={16} /> },
      { id: 'identifiers', label: 'Spatial Identifiers', icon: <Hash size={16} /> },
      { id: 'ai-review', label: 'AI Review', icon: <Sparkles size={16} /> },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'audit', label: 'Audit Trail', icon: <ScrollText size={16} /> },
      { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  active: string;
  onNav: (s: string) => void;
}

export default function MobileNavDrawer({ isOpen, onClose, active, onNav }: Props) {
  // Close drawer when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 lg:hidden"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <motion.aside
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="flex flex-col h-full w-72 max-w-[85vw]"
          style={{
            background: 'var(--color-bg-surface)',
            borderRight: '1px solid var(--color-border-secondary)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border-secondary)' }}>
            <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>
              NAVIGATION
            </h3>
            <motion.button
              onClick={onClose}
              className="btn-ghost p-2"
              style={{ padding: 8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Close navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-tertiary)' }}>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </motion.button>
          </div>

          {/* Navigation items */}
          <div className="flex-1 overflow-y-auto p-4">
            {SECTIONS.map((section) => (
              <div key={section.title} className="mb-6">
                <div className="px-2 mb-2" style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: 'var(--color-text-quaternary)',
                  fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}>
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const isActive = active === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => { onNav(item.id); onClose(); }}
                      layout
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                      style={{
                        background: isActive ? 'var(--color-primary-bg)' : 'transparent',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                        fontWeight: isActive ? 500 : 400,
                        borderLeft: `3px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                        paddingLeft: isActive ? '13px' : '16px',
                      }}
                      whileHover={{ x: 4, backgroundColor: isActive ? 'var(--color-primary-bg)' : 'var(--color-bg-hover)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span style={{ 
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-quaternary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        flexShrink: 0,
                      }}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* System status footer */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--color-border-secondary)' }}>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: 'var(--color-text-quaternary)',
              fontFamily: 'var(--font-body)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}>
              SYSTEM STATUS
            </div>
            {[
              { label: 'DATABASE', status: 'ONLINE', ok: true },
              { label: 'GIS ENGINE', status: 'READY', ok: true },
              { label: '3D ENGINE', status: 'READY', ok: true },
              { label: 'VERSION', status: '2.4.1', ok: null },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center mb-2">
                <span className="font-mono" style={{ fontSize: 9, color: 'var(--color-text-quaternary)', letterSpacing: '0.08em' }}>
                  {row.label}
                </span>
                <span className="font-mono" style={{
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  color: row.ok === null ? 'var(--color-text-quaternary)' : row.ok ? 'var(--color-success)' : 'var(--color-error)',
                }}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}