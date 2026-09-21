import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Building2, Layers, MapPin, Hash } from 'lucide-react';
import type { Screen } from '../types';

const RESULTS = [
  {
    group: 'PARCELS',
    icon: <MapPin size={11} />,
    items: [
      { id: '29384756102934', label: 'Land Parcel', sub: 'ULPIN: 29384756102934 · 1 Building' },
    ],
  },
  {
    group: 'BUILDINGS',
    icon: <Building2 size={11} />,
    items: [
      { id: 'B01', label: 'Building B01', sub: '29384756102934 · 3 Floors' },
    ],
  },
  {
    group: 'PROPERTY UNITS',
    icon: <FileText size={11} />,
    items: [
      { id: 'U01', label: 'Property Unit U01', sub: '29384756102934-B01-F01-U01-V01 · Floor F01' },
      { id: 'U02', label: 'Property Unit U02', sub: '29384756102934-B01-F01-U02-V01 · Floor F01' },
      { id: 'U03', label: 'Property Unit U03', sub: '29384756102934-B01-F02-U03-V01 · Floor F02' },
      { id: 'U04', label: 'Property Unit U04', sub: '29384756102934-B01-F02-U04-V01 · Floor F02' },
    ],
  },
  {
    group: 'SPATIAL IDENTIFIERS',
    icon: <Hash size={11} />,
    items: [
      { id: 'SID01', label: '29384756102934-B01-F01-U01-V01', sub: 'Unit U01 · Active · V01' },
      { id: 'SID02', label: '29384756102934-B01-F01-U02-V01', sub: 'Unit U02 · Active · V01' },
    ],
  },
];

interface Props {
  onClose: () => void;
  onNav: (s: Screen) => void;
}

export default function SearchModal({ onClose, onNav }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = query.length < 2
    ? RESULTS
    : RESULTS.map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(query.toLowerCase()) ||
            i.sub.toLowerCase().includes(query.toLowerCase()),
        ),
      })).filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-24 z-50"
      style={{ background: 'rgba(11, 19, 43, 0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="fade-in w-full flex flex-col"
        style={{
          maxWidth: 640,
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Input */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ borderBottom: '1px solid var(--color-border-primary)', height: 52 }}
        >
          <Search size={14} style={{ color: 'var(--color-text-quaternary)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH CADASTRAL DATABASE..."
            className="flex-1"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.04em',
              padding: 0,
            }}
          />
          <button onClick={onClose} className="btn-ghost" style={{ padding: 4 }}>
            <X size={12} style={{ color: 'var(--color-text-quaternary)' }} />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
          {filtered.map((group) => (
            <div key={group.group}>
              <div
                className="px-4 py-2 flex items-center gap-2"
                style={{ borderBottom: '1px solid var(--color-border-secondary)' }}
              >
                <span style={{ color: 'var(--color-text-quaternary)' }}>{group.icon}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    color: 'var(--color-text-quaternary)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {group.group}
                </span>
              </div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex flex-col px-5 py-3 text-left transition-colors"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-border-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => { onNav('records'); onClose(); }}
                >
                  <span
                    className="font-mono"
                    style={{ fontSize: 11, color: 'var(--color-text-primary)', letterSpacing: '0.02em' }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="font-mono"
                    style={{ fontSize: 9, color: 'var(--color-text-quaternary)', marginTop: 2, letterSpacing: '0.04em' }}
                  >
                    {item.sub}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Keyboard hints */}
        <div
          className="flex items-center gap-4 px-4 py-2"
          style={{ borderTop: '1px solid var(--color-border-primary)' }}
        >
          {[['↵', 'OPEN'], ['ESC', 'CLOSE'], ['↑↓', 'NAVIGATE']].map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="font-mono"
                style={{
                  fontSize: 9,
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border-primary)',
                  padding: '1px 5px',
                  borderRadius: 2,
                }}
              >
                {key}
              </span>
              <span
                style={{ fontSize: 9, color: 'var(--color-text-quaternary)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
