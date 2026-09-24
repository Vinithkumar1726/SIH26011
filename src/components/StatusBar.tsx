export default function StatusBar() {
  const now = new Date();
  const ts = now.toLocaleTimeString('en-GB', { hour12: false });
  const date = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  return (
    <footer
      className="flex items-center justify-between px-3 shrink-0"
      style={{
        height: 32,
        background: '#111111',
        borderTop: '2px solid #000000',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="font-mono"
          style={{ fontSize: 9, color: '#F5C400', letterSpacing: '0.08em', fontWeight: 700 }}
        >
          SYS: ONLINE
        </span>
        <span
          className="font-mono hidden md:inline"
          style={{ fontSize: 9, color: '#a3a3a3', letterSpacing: '0.08em' }}
        >
          EPSG:4326 · WGS84
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="font-mono hidden sm:inline"
          style={{ fontSize: 9, color: '#a3a3a3', letterSpacing: '0.08em' }}
        >
          LIVE SCENE
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 9, color: '#F4F1E8', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}
        >
          {date} · {ts}
        </span>
      </div>
    </footer>
  );
}
