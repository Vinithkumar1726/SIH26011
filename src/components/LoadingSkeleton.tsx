/**
 * SIH26011 - Loading Skeleton
 * Animated skeleton loaders matching card shapes
 */

import { motion } from 'framer-motion';
import { SURFACE } from '../design/tokens';

interface SkeletonProps {
  variant?: 'card' | 'table-row' | 'stat-card' | 'list-item' | 'unit-card' | 'custom';
  className?: string;
  style?: React.CSSProperties;
  rows?: number;
  height?: number;
}

const shimmerAnimation = {
  initial: { backgroundPosition: '-200% 0' },
  animate: { backgroundPosition: '200% 0' },
  transition: { duration: 1.5, repeat: Infinity, ease: 'linear' as const },
};

export function Skeleton({ 
  variant = 'card', 
  className = '', 
  style = {}, 
  rows = 3,
  height 
}: SkeletonProps) {
  const baseStyle: React.CSSProperties = {
    background: SURFACE.panel,
    border: `3px solid #000000`,
    boxShadow: '4px 4px 0 #000000',
    borderRadius: 0,
    overflow: 'hidden',
    ...style,
  };

  const variants: Record<string, React.CSSProperties> = {
    card: { minHeight: height || 200, padding: 20 },
    'stat-card': { minHeight: height || 120, padding: 20 },
    'table-row': { minHeight: height || 56, padding: '12px 16px', display: 'flex', alignItems: 'center' },
    'list-item': { minHeight: height || 72, padding: '12px 16px' },
    'unit-card': { minHeight: height || 160, padding: 16 },
    custom: { minHeight: height || 100 },
  };

  const skeletonRows = Array.from({ length: rows }, (_, i) => (
    <motion.div
      key={i}
      {...shimmerAnimation}
      style={{
        height: variant === 'stat-card' ? (i === 0 ? 32 : 20) : 16,
        marginBottom: variant === 'stat-card' ? (i === 0 ? 12 : 8) : 8,
        borderRadius: 2,
        background: `linear-gradient(90deg, ${SURFACE.raised} 25%, ${SURFACE.input} 50%, ${SURFACE.raised} 75%)`,
        backgroundSize: '200% 100%',
        width: variant === 'table-row' ? `${60 + Math.random() * 30}%` : `${70 + Math.random() * 25}%`,
      }}
    />
  ));

  return (
    <div className={className} style={baseStyle}>
      {variant === 'table-row' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: '100%' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(90deg, ${SURFACE.raised} 25%, ${SURFACE.input} 50%, ${SURFACE.raised} 75%)`, backgroundSize: '200% 100%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {skeletonRows}
          </div>
        </div>
      ) : (
        <div style={variants[variant]}>
          {skeletonRows}
        </div>
      )}
    </div>
  );
}

// Grid of skeleton cards
export function SkeletonGrid({ count = 4, variant = 'card' }: { count?: number; variant?: SkeletonProps['variant'] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} variant={variant} />
      ))}
    </div>
  );
}

// Table skeleton
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ background: SURFACE.panel, border: '3px solid #000', boxShadow: '4px 4px 0 #000' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, padding: '12px 16px', background: '#0E1320', borderBottom: '3px solid #000', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9AA3B2' }}>
        {Array.from({ length: columns }, (_, i) => (
          <motion.div key={i} {...shimmerAnimation} style={{ height: 12, background: `linear-gradient(90deg, ${SURFACE.raised} 25%, ${SURFACE.input} 50%, ${SURFACE.raised} 75%)`, backgroundSize: '200% 100%', borderRadius: 2 }} />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} variant="table-row" style={{ borderTop: i > 0 ? '2px solid #1B2233' : 'none', boxShadow: 'none', border: 'none' }} />
        ))}
      </div>
    </div>
  );
}