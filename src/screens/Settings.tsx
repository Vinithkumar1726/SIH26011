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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0A0D12' }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #28313C' }}>
        <div className="font-mono text-[10px] tracking-[0.2em] text-amber-300/70 mb-1">SYSTEM · PREFERENCES</div>
        <h1 className="font-display font-semibold" style={{ fontSize: 18, color: '#F1F3F5', letterSpacing: '0.04em' }}>
          SETTINGS
        </h1>
        <p style={{ fontSize: 11, color: '#6E7783', marginTop: 4 }}>
          System configuration and application preferences.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-5" style={{ maxWidth: 680 }}>
          {SECTIONS.map((section, si) => (
            <div
              key={section.title}
              className="fade-up"
              style={{ background: '#10151C', border: '1px solid #28313C', borderRadius: 'var(--radius-lg)', overflow: 'hidden', animationDelay: `${si * 60}ms` }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid #28313C' }}
              >
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: '#6E7783', fontFamily: 'IBM Plex Sans' }}>
                  {section.title}
                </span>
                <span className="chip" style={{ background: 'transparent' }}>{section.rows.length} FIELDS</span>
              </div>
              {section.rows.map((row, i) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < section.rows.length - 1 ? '1px solid #151B23' : undefined }}
                >
                  <span style={{ fontSize: 11, color: '#A8B0BA', fontFamily: 'IBM Plex Sans' }}>
                    {row.label}
                  </span>
                  {!row.type || row.type === 'text' ? (
                    <input
                      value={values[row.key]}
                      onChange={(e) => setValues((p) => ({ ...p, [row.key]: e.target.value }))}
                      style={{
                        background: '#151B23',
                        border: '1px solid #28313C',
                        borderRadius: 2,
                        padding: '4px 10px',
                        fontFamily: 'IBM Plex Mono',
                        fontSize: 10,
                        color: '#F1F3F5',
                        width: 280,
                        outline: 'none',
                      }}
                      readOnly={!row.type}
                    />
                  ) : row.type === 'select' ? (
                    <select
                      value={values[row.key]}
                      onChange={(e) => setValues((p) => ({ ...p, [row.key]: e.target.value }))}
                      style={{
                        background: '#151B23',
                        border: '1px solid #28313C',
                        borderRadius: 2,
                        padding: '4px 10px',
                        fontFamily: 'IBM Plex Mono',
                        fontSize: 10,
                        color: '#F1F3F5',
                        width: 200,
                        outline: 'none',
                      }}
                    >
                      {row.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <button
                      onClick={() => setValues((p) => ({ ...p, [row.key]: p[row.key] === 'ON' ? 'OFF' : 'ON' }))}
                      style={{
                        background: values[row.key] === 'ON' ? 'rgba(79,184,172,0.15)' : '#151B23',
                        border: `1px solid ${values[row.key] === 'ON' ? '#4FB8AC' : '#28313C'}`,
                        borderRadius: 10,
                        width: 36,
                        height: 18,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: values[row.key] === 'ON' ? '#4FB8AC' : '#6E7783',
                        position: 'absolute',
                        top: 2,
                        left: values[row.key] === 'ON' ? 20 : 2,
                        transition: 'left 0.2s',
                      }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Keyboard shortcuts */}
          <div className="fade-up" style={{ background: '#10151C', border: '1px solid #28313C', borderRadius: 'var(--radius-lg)', overflow: 'hidden', animationDelay: '240ms' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #28313C' }}>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: '#6E7783', fontFamily: 'IBM Plex Sans' }}>
                KEYBOARD SHORTCUTS
              </span>
              <span className="chip chip-gold">8 BINDS</span>
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
                  <kbd className="font-mono" style={{
                    fontSize: 9, color: '#E8C88A', background: '#1B222C',
                    border: '1px solid rgb(201 154 69 / 0.35)', padding: '2px 8px', borderRadius: 6,
                    minWidth: 80, textAlign: 'center', boxShadow: '0 2px 0 rgb(0 0 0 / 0.4)',
                  }}>
                    {key}
                  </kbd>
                  <span style={{ fontSize: 10, color: '#6E7783', fontFamily: 'IBM Plex Sans' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
