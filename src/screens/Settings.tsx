import { useState } from 'react';

interface SettingRow {
  key: string;
  label: string;
  value: string;
  type?: 'text' | 'select' | 'toggle';
  options?: string[];
}

const SECTIONS: { title: string; rows: SettingRow[] }[] = [
  {
    title: 'SYSTEM',
    rows: [
      { key: 'api_endpoint', label: 'API Endpoint', value: 'https://api.ulpin3d.in/v1', type: 'text' },
      { key: 'db_conn', label: 'Database Connection', value: 'postgres://ulpin@localhost:5432/cadastral', type: 'text' },
      { key: 'gis_engine', label: 'GIS Engine', value: 'PostGIS 3.4', type: 'text' },
      { key: 'crs', label: 'Coordinate Reference System', value: 'EPSG:4326', type: 'select', options: ['EPSG:4326', 'EPSG:32643', 'EPSG:7755'] },
    ],
  },
  {
    title: '3D VIEWER',
    rows: [
      { key: 'default_camera', label: 'Default Camera', value: 'Isometric', type: 'select', options: ['Isometric', 'Perspective', 'Top'] },
      { key: 'grid_vis', label: 'Grid Visibility', value: 'ON', type: 'toggle' },
      { key: 'unit_vis', label: 'Unit Labels', value: 'ON', type: 'toggle' },
      { key: 'wireframe', label: 'Wireframe Overlay', value: 'OFF', type: 'toggle' },
      { key: 'terrain', label: 'Terrain Layer', value: 'OFF', type: 'toggle' },
    ],
  },
  {
    title: 'VALIDATION',
    rows: [
      { key: 'overlap_tol', label: 'Overlap Tolerance (m)', value: '0.001', type: 'text' },
      { key: 'elev_tol', label: 'Elevation Tolerance (m)', value: '0.01', type: 'text' },
      { key: 'geom_prec', label: 'Geometry Precision (decimal places)', value: '6', type: 'text' },
    ],
  },
  {
    title: 'APPLICATION',
    rows: [
      { key: 'theme', label: 'Theme', value: 'DARK (DEFAULT)', type: 'select', options: ['DARK (DEFAULT)'] },
      { key: 'keyboard', label: 'Keyboard Shortcuts', value: 'ENABLED', type: 'toggle' },
      { key: 'version', label: 'Application Version', value: 'v2.4.1 (SIH26011)' },
    ],
  },
];

export default function Settings() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(SECTIONS.flatMap((s) => s.rows.map((r) => [r.key, r.value])))
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F4F1E8' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '3px solid #111111', background: '#FFFFFF' }}>
        <div className="brutal-eyebrow">System · Preferences</div>
        <h1 className="font-display font-bold" style={{ fontSize: 18, color: '#111111', letterSpacing: '0.01em' }}>
          SETTINGS
        </h1>
        <p style={{ fontSize: 11, color: '#555555', marginTop: 4 }}>
          System configuration and application preferences.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-5" style={{ maxWidth: 680 }}>
          {SECTIONS.map((section, si) => (
            <div
              key={section.title}
              className="brutal-panel"
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <div
                className="brutal-header"
              >
                <span className="brutal-title">{section.title}</span>
                <span className="brutal-badge brutal-badge-gold">{section.rows.length} FIELDS</span>
              </div>
              {section.rows.map((row, i) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < section.rows.length - 1 ? '2px solid #111111' : undefined }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#111111', fontFamily: 'IBM Plex Sans' }}>
                    {row.label}
                  </span>
                  {!row.type || row.type === 'text' ? (
                    <input
                      value={values[row.key]}
                      onChange={(e) => setValues((p) => ({ ...p, [row.key]: e.target.value }))}
                      className="brutal-input font-mono"
                      style={{ fontSize: 10, width: 280 }}
                      readOnly={!row.type}
                    />
                  ) : row.type === 'select' ? (
                    <select
                      value={values[row.key]}
                      onChange={(e) => setValues((p) => ({ ...p, [row.key]: e.target.value }))}
                      className="brutal-input font-mono"
                      style={{ fontSize: 10, width: 200 }}
                    >
                      {row.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <button
                      onClick={() => setValues((p) => ({ ...p, [row.key]: p[row.key] === 'ON' ? 'OFF' : 'ON' }))}
                      aria-label={row.label}
                      style={{
                        background: values[row.key] === 'ON' ? '#16A34A' : '#fff',
                        border: '2px solid #111111',
                        width: 44,
                        height: 22,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{
                        width: 14,
                        height: 14,
                        background: values[row.key] === 'ON' ? '#fff' : '#111',
                        border: '2px solid #111',
                        position: 'absolute',
                        top: 2,
                        left: values[row.key] === 'ON' ? 24 : 2,
                        transition: 'left 0.1s',
                      }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Keyboard shortcuts */}
          <div className="brutal-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="brutal-header">
              <span className="brutal-title">Keyboard Shortcuts</span>
              <span className="brutal-badge brutal-badge-gold">8 BINDS</span>
            </div>
            <div className="p-4 grid gap-2" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              {[
                ['Ctrl/Cmd + K', 'Global Search'],
                ['Esc', 'Close Modal'],
                ['R', 'Reset 3D Camera'],
                ['F', 'Fit Selection'],
                ['1–8', 'Select Floor'],
                ['W', 'Wireframe Mode'],
                ['E', 'Explode View'],
                ['S', 'Solid Mode'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd className="brutal-kbd" style={{ minWidth: 80, textAlign: 'center' }}>
                    {key}
                  </kbd>
                  <span style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Sans' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
