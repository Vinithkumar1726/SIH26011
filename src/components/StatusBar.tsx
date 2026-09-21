export default function StatusBar() {
  const now = new Date();
  const ts = now.toLocaleTimeString('en-GB', { hour12: false });
  const date = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  return (
    <footer
      className="flex items-center justify-between px-4 shrink-0"
      style={{
        height: 26,
        background: 'var(--color-bg-surface)',
        borderTop: '1px solid var(--color-border-secondary)',
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="font-mono"
          style={{ fontSize: 9, color: 'var(--color-text-quaternary)', letterSpacing: '0.08em' }}
        >
          SIH26011 · 3D ULPIN CADASTRAL GIS WORKSTATION · v2.4.1
        </span>
        <span
          style={{
            width: 1,
            height: 10,
            background: 'var(--color-border-primary)',
            display: 'inline-block',
          }}
        />
        <span
          className="font-mono hidden md:inline"
          style={{ fontSize: 9, color: 'var(--color-text-quaternary)', letterSpacing: '0.08em' }}
        >
          EPSG:4326 · WGS84
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span
          className="font-mono hidden sm:inline"
          style={{ fontSize: 9, color: 'var(--color-text-quaternary)', letterSpacing: '0.08em' }}
        >
          4 UNITS · 1 PARCEL · 1 BUILDING
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 9, color: 'var(--color-text-quaternary)', letterSpacing: '0.08em' }}
        >
          {date} · {ts}
        </span>
      </div>
    </footer>
  );
}
