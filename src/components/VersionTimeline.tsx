/**
 * SIH26011 - Version Timeline
 * Spatial ID version chain visualization
 */

import { motion } from 'framer-motion';
import { DOMAIN, SURFACE, BORDER, SHADOW, FONT, LABEL, onDomain } from '../design/tokens';

interface VersionEntry {
  version: number;
  identifier_string: string;
  geometry_hash: string;
  changed_at: string;
  changed_by?: string | null;
  reason?: string | null;
  is_current?: boolean;
}

interface VersionTimelineProps {
  versions: VersionEntry[];
  currentVersion: number;
  onSelectVersion?: (version: number) => void;
}

export function VersionTimeline({ versions, currentVersion, onSelectVersion }: VersionTimelineProps) {
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div style={{ 
      background: SURFACE.panel, 
      border: BORDER, 
      boxShadow: SHADOW,
      padding: 20,
      fontFamily: FONT.body,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <h3 style={{
          fontFamily: FONT.display,
          fontSize: 16,
          fontWeight: 600,
          color: '#F4F1E8',
          margin: 0,
        }}>
          Version History
        </h3>
        <span style={{
          ...LABEL,
          fontSize: 10,
          color: DOMAIN.temporal,
          background: 'rgba(139, 92, 246, 0.15)',
          padding: '4px 10px',
          border: `2px solid ${DOMAIN.temporal}`,
        }}>
          {sortedVersions.length} versions
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Timeline line */}
        <div style={{
          position: 'absolute',
          left: 18,
          top: 0,
          bottom: 0,
          width: 2,
          background: '#1B2233',
        }} />

        {sortedVersions.map((version, index) => (
          <motion.div
            key={version.version}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            style={{ 
              display: 'flex', 
              marginBottom: index === sortedVersions.length - 1 ? 0 : 24,
              position: 'relative',
            }}
            onClick={() => onSelectVersion?.(version.version)}
            className={version.is_current ? 'current' : ''}
          >
            {/* Timeline dot */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: version.is_current ? DOMAIN.ok : '#1B2233',
              border: `3px solid ${version.is_current ? DOMAIN.ok : '#000'}`,
              boxShadow: version.is_current ? `0 0 0 4px ${SURFACE.panel}, 0 0 20px ${DOMAIN.ok}40` : SHADOW,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginRight: 16,
              cursor: onSelectVersion ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}>
              <span style={{
                fontFamily: FONT.mono,
                fontSize: 11,
                fontWeight: 700,
                color: version.is_current ? onDomain('ok') : '#6B7280',
              }}>
                V{String(version.version).padStart(2, '0')}
              </span>
            </div>

            {/* Version content */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: FONT.mono,
                    fontSize: 11,
                    color: '#9AA3B2',
                    marginBottom: 4,
                    wordBreak: 'break-all',
                  }}>
                    {version.identifier_string}
                  </div>
                  <div style={{
                    fontFamily: FONT.mono,
                    fontSize: 10,
                    color: '#6B7280',
                    fontWeight: 500,
                  }}>
                    Hash: {version.geometry_hash.slice(0, 16)}...
                  </div>
                </div>

                {version.is_current && (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    style={{
                      ...LABEL,
                      fontSize: 9,
                      color: onDomain('ok'),
                      background: DOMAIN.ok,
                      padding: '3px 8px',
                      border: `2px solid ${DOMAIN.ok}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    CURRENT
                  </motion.span>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, fontSize: 11, color: '#9AA3B2' }}>
                <span style={{ fontFamily: FONT.mono }}>
                  📅 {new Date(version.changed_at).toLocaleString()}
                </span>
                {version.changed_by && (
                  <span style={{ fontFamily: FONT.mono }}>
                    👤 {version.changed_by}
                  </span>
                )}
                {version.reason && (
                  <span style={{ fontFamily: FONT.mono, maxWidth: '100%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    📝 {version.reason}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Compact version for inline use
export function CompactVersionTimeline({ versions, currentVersion }: { versions: VersionEntry[]; currentVersion: number }) {
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
  const showCount = 3;
  const visible = sortedVersions.slice(0, showCount);
  const hiddenCount = sortedVersions.length - showCount;

  return (
    <div style={{ fontFamily: FONT.mono, fontSize: 11 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: hiddenCount > 0 ? 8 : 0 }}>
        {visible.map((version, index) => (
          <motion.button
            key={version.version}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {}}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: version.is_current ? `rgba(163, 230, 53, 0.15)` : SURFACE.raised,
              border: version.is_current ? `2px solid ${DOMAIN.ok}` : '2px solid #000',
              color: version.is_current ? DOMAIN.ok : '#9AA3B2',
              cursor: 'pointer',
              borderRadius: 0,
              fontFamily: FONT.mono,
              fontSize: 10,
              fontWeight: 600,
              boxShadow: version.is_current ? '2px 2px 0 #000' : '2px 2px 0 #000',
              transition: 'all 0.1s',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            V{String(version.version).padStart(2, '0')}
            {version.is_current && <span style={{ color: DOMAIN.ok }}>●</span>}
          </motion.button>
        ))}
        {hiddenCount > 0 && (
          <button style={{
            padding: '6px 10px',
            background: SURFACE.input,
            border: '2px solid #000',
            color: '#6B7280',
            fontFamily: FONT.mono,
            fontSize: 10,
            cursor: 'default',
          }}>
            +{hiddenCount} more
          </button>
        )}
      </div>
      <p style={{ margin: 0, color: '#6B7280', fontSize: 10 }}>
        Current: V{String(currentVersion).padStart(2, '0')} · {sortedVersions.length} total versions
      </p>
    </div>
  );
}