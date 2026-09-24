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
            background: '#111111',
            borderRight: '3px solid #000000',
            boxShadow: '8px 0 0 rgba(0,0,0,0.35)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '2px solid #F5C400' }}>
            <div>
              <div className="font-display font-bold text-white" style={{ fontSize: 15 }}>SIH26011</div>
              <div className="font-mono" style={{ fontSize: 8, letterSpacing: '0.18em', color: '#F5C400' }}>NAVIGATION</div>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 text-white hover:bg-[#F5C400] hover:text-black"
              style={{ padding: 8, border: '2px solid #F5C400' }}
              whileTap={{ scale: 0.92 }}
              aria-label="Close navigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </motion.button>
          </div>

          {/* Navigation items */}
          <div className="flex-1 overflow-y-auto p-3">
            {SECTIONS.map((section) => (
              <div key={section.title} className="mb-5">
                <div className="px-2 mb-1.5" style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: '#8a8a8a',
                  fontFamily: 'var(--brutal-font-body)',
                  textTransform: 'uppercase',
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-100"
                      style={{
                        background: isActive ? '#F5C400' : 'transparent',
                        color: isActive ? '#111111' : '#d4d4d4',
                        fontWeight: isActive ? 700 : 500,
                        border: '2px solid transparent',
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span style={{ 
                        color: isActive ? '#111111' : '#F5C400',
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