import { StatusDot } from '../design/primitives';
import { DOMAIN, FONT, INK, MUTED, PAPER, SURFACE } from '../design/tokens';

export default function StatusBar() {
  const now = new Date();
  const ts = now.toLocaleTimeString('en-GB', { hour12: false });
  const date = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  const cell: React.CSSProperties = {
    fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.08em', fontWeight: 700,
  };

  return (
    <footer
      className="flex items-center justify-between px-3 shrink-0"
      style={{ height: 32, background: SURFACE.panel, borderTop: `3px solid ${INK}` }}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5" style={{ ...cell, color: DOMAIN.ok }}>
          <StatusDot domain="ok" size={8} />SYS: ONLINE
        </span>
        <span className="hidden md:inline" style={{ ...cell, color: MUTED }}>
          EPSG:4326 · WGS84
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline" style={{ ...cell, color: MUTED }}>
          LIVE SCENE
        </span>
        <span style={{ ...cell, color: PAPER, fontVariantNumeric: 'tabular-nums' }}>
          {date} · {ts}
        </span>
      </div>
    </footer>
  );
}
