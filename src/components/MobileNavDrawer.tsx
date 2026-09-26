import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Upload, Box, FileText, ShieldCheck, Hash, Sparkles, ScrollText, Settings, X } from 'lucide-react';
import type { Screen } from '../types';
import { StatusDot } from '../design/primitives';
import {
  BORDER_THIN, DOMAIN, FONT, INK, MUTED, PAPER, SURFACE, onDomain, type DomainKey,
} from '../design/tokens';

const SECTIONS: { title: string; accent: DomainKey; items: { id: string; label: string; icon: React.ReactNode }[] }[] = [
  {
    title: 'WORKSPACE',
    accent: 'spatial',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      { id: 'import', label: 'Import Data', icon: <Upload size={16} /> },
      { id: 'explorer', label: '3D Explorer', icon: <Box size={16} /> },
      { id: 'records', label: 'Property Records', icon: <FileText size={16} /> },
    ],
  },
  {
    title: 'ANALYSIS',
    accent: 'ai',
    items: [
      { id: 'validation', label: 'Validation', icon: <ShieldCheck size={16} /> },
      { id: 'identifiers', label: 'Spatial Identifiers', icon: <Hash size={16} /> },
      { id: 'ai-review', label: 'AI Review', icon: <Sparkles size={16} /> },
    ],
  },
  {
    title: 'SYSTEM',
    accent: 'temporal',
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
        style={{ background: 'rgba(0, 0, 0, 0.6)' }}
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
          style={{ background: SURFACE.panel, borderRight: `3px solid ${INK}` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: `3px solid ${INK}`, background: DOMAIN.record }}>
            <div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, color: INK, fontSize: 15 }}>
                SIH26011
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: '0.18em', color: INK }}>
                NAVIGATION
              </div>
            </div>
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.92 }}
              aria-label="Close navigation"
              style={{ padding: 8, background: INK, color: PAPER, border: `2px solid ${INK}`, cursor: 'pointer' }}
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Navigation items */}
          <div className="flex-1 overflow-y-auto p-3">
            {SECTIONS.map((section) => (
              <div key={section.title} style={{ marginBottom: 20 }}>
                <div
                  className="px-2 mb-1.5"
                  style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
                    color: DOMAIN[section.accent], fontFamily: FONT.body,
                    textTransform: 'uppercase',
                  }}
                >
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const isActive = active === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => { onNav(item.id); onClose(); }}
                      layout
                      className="w-full flex items-center gap-3 px-3 py-2.5"
                      style={{
                        background: isActive ? DOMAIN[section.accent] : 'transparent',
                        color: isActive ? onDomain(section.accent) : PAPER,
                        fontWeight: isActive ? 700 : 500,
                        border: isActive ? BORDER_THIN : '2px solid transparent',
                        boxShadow: isActive ? '3px 3px 0 #000000' : 'none',
                        cursor: 'pointer',
                        transition: 'background 100ms',
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span
                        style={{
                          color: isActive ? onDomain(section.accent) : DOMAIN[section.accent],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 20, height: 20, flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate" style={{ fontFamily: FONT.body }}>{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* System status footer */}
          <div className="p-4" style={{ borderTop: `2px solid ${INK}` }}>
            <div
              style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                color: MUTED, fontFamily: FONT.body, marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              SYSTEM STATUS
            </div>
            {[
              { label: 'POSTGIS 3D TOPOLOGY', status: 'ONLINE', domain: 'ok' as DomainKey },
              { label: 'NASA SRTM ELEVATION', status: 'SYNCED', domain: 'ok' as DomainKey },
              { label: 'YOLOv11-ONNX VISION', status: 'ACTIVE', domain: 'ai' as DomainKey },
              { label: 'VERSION', status: 'vSIH26011 - SVAMITVA BUILD', domain: null },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center mb-2">
                <span
                  className="flex items-center gap-1.5"
                  style={{ fontFamily: FONT.mono, fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}
                >
                  {row.domain && <StatusDot domain={row.domain} size={8} />}
                  {row.label}
                </span>
                <span
                  style={{
                    fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.08em', fontWeight: 700,
                    color: row.domain ? DOMAIN[row.domain] : MUTED,
                  }}
                >
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
