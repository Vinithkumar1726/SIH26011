/**
 * SIH26011 - Toast Notifications
 * Slide-in notifications with domain-colored borders
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DOMAIN, SURFACE, BORDER, SHADOW, FONT, LABEL, onDomain } from '../design/tokens';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'spatial' | 'ai' | 'conflict' | 'record' | 'temporal';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TYPE_CONFIG: Record<ToastType, { color: string; icon: string; label: string }> = {
  success: { color: DOMAIN.ok, icon: '✓', label: 'Success' },
  error: { color: DOMAIN.conflict, icon: '✕', label: 'Error' },
  warning: { color: DOMAIN.warn, icon: '⚠', label: 'Warning' },
  info: { color: DOMAIN.info, icon: 'ℹ', label: 'Info' },
  spatial: { color: DOMAIN.spatial, icon: '🗺', label: 'Spatial' },
  ai: { color: DOMAIN.ai, icon: '🤖', label: 'AI' },
  conflict: { color: DOMAIN.conflict, icon: '⚡', label: 'Conflict' },
  record: { color: DOMAIN.record, icon: '📋', label: 'Record' },
  temporal: { color: DOMAIN.temporal, icon: '🕐', label: 'Temporal' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const config = TYPE_CONFIG[toast.type];

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        background: SURFACE.panel,
        border: BORDER,
        boxShadow: SHADOW,
        borderLeft: `6px solid ${config.color}`,
        minWidth: 320,
        maxWidth: 480,
        fontFamily: FONT.body,
      }}
    >
      <div style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: `rgba(${config.color.slice(1).match(/.{2}/g)?.map(h => parseInt(h, 16)).join(', ')}, 0.15)`,
        border: `2px solid ${config.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        flexShrink: 0,
        marginTop: 2,
      }}>
        {config.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}>
          <span style={{
            fontFamily: FONT.display,
            fontSize: 14,
            fontWeight: 600,
            color: '#F4F1E8',
          }}>
            {toast.title}
          </span>
          <span style={{
            ...LABEL,
            fontSize: 9,
            color: config.color,
            background: `rgba(${config.color.slice(1).match(/.{2}/g)?.map(h => parseInt(h, 16)).join(', ')}, 0.15)`,
            padding: '2px 8px',
            border: `2px solid ${config.color}`,
          }}>
            {config.label}
          </span>
        </div>

        {toast.message && (
          <p style={{
            margin: 0,
            fontSize: 13,
            color: '#9AA3B2',
            lineHeight: 1.4,
          }}>
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          width: 24,
          height: 24,
          borderRadius: 0,
          background: 'transparent',
          border: 'none',
          color: '#6B7280',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    if (toast.duration !== 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration ?? 5000);
    }
  };

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={dismiss}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Convenience hooks for common toast types
export function useToastHelpers() {
  const { show } = useToast();

  return {
    success: (title: string, message?: string) => show({ type: 'success', title, message }),
    error: (title: string, message?: string) => show({ type: 'error', title, message }),
    warning: (title: string, message?: string) => show({ type: 'warning', title, message }),
    info: (title: string, message?: string) => show({ type: 'info', title, message }),
    spatial: (title: string, message?: string) => show({ type: 'spatial', title, message }),
    ai: (title: string, message?: string) => show({ type: 'ai', title, message }),
    conflict: (title: string, message?: string) => show({ type: 'conflict', title, message }),
    record: (title: string, message?: string) => show({ type: 'record', title, message }),
    temporal: (title: string, message?: string) => show({ type: 'temporal', title, message }),
  };
}