import { useState, useEffect } from 'react';
import { Badge, Input, Panel, Skeleton } from '../design/primitives';
import { INK, DOMAIN, FONT, MUTED, PAPER, SURFACE } from '../design/tokens';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.temporal }}>
            System · Preferences
          </div>
          <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER, letterSpacing: '0.01em' }}>
            SETTINGS
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: SURFACE.app }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: `3px solid ${INK}`, background: SURFACE.panel }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: DOMAIN.temporal }}>
          System · Preferences
        </div>
        <h1 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: PAPER, letterSpacing: '0.01em' }}>
          SETTINGS
        </h1>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
          System configuration and application preferences.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-5" style={{ maxWidth: 680 }}>
          {SECTIONS.map((section) => (
            <Panel key={section.title} title={section.title}
              right={<Badge domain="info">{section.rows.length} FIELDS</Badge>}>
              {section.rows.map((row, i) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between px-1 py-3"
                  style={{ borderBottom: i < section.rows.length - 1 ? `2px solid ${INK}` : undefined }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: PAPER, fontFamily: FONT.body }}>
                    {row.label}
                  </span>
                  {!row.type || row.type === 'text' ? (
                    <Input
                      value={values[row.key]}
                      onChange={(e) => setValues((p) => ({ ...p, [row.key]: e.target.value }))}
                      style={{ fontSize: 10, width: 280 }}
                      readOnly={!row.type}
                    />
                  ) : row.type === 'select' ? (
                    <select
                      value={values[row.key]}
                      onChange={(e) => setValues((p) => ({ ...p, [row.key]: e.target.value }))}
                      style={{
                        fontFamily: FONT.mono, fontSize: 10, width: 200,
                        background: SURFACE.input, color: PAPER,
                        border: `2px solid ${INK}`, padding: '8px 10px',
                      }}
                    >
                      {row.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <button
                      onClick={() => setValues((p) => ({ ...p, [row.key]: p[row.key] === 'ON' ? 'OFF' : 'ON' }))}
                      aria-label={row.label}
                      style={{
                        background: values[row.key] === 'ON' ? DOMAIN.ok : SURFACE.input,
                        border: `2px solid ${INK}`,
                        width: 44, height: 22, cursor: 'pointer', position: 'relative',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{
                        width: 14, height: 14,
                        background: values[row.key] === 'ON' ? INK : MUTED,
                        border: `2px solid ${INK}`,
                        position: 'absolute', top: 2,
                        left: values[row.key] === 'ON' ? 24 : 2,
                        transition: 'left 0.1s',
                      }} />
                    </button>
                  )}
                </div>
              ))}
            </Panel>
          ))}

          {/* Keyboard shortcuts */}
          <Panel title="Keyboard Shortcuts" right={<Badge domain="info">8 BINDS</Badge>}>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
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
                  <kbd
                    style={{
                      minWidth: 80, textAlign: 'center', fontFamily: FONT.mono,
                      fontSize: 10, fontWeight: 700, color: PAPER,
                      background: SURFACE.raised, border: `2px solid ${INK}`, padding: '3px 8px',
                    }}
                  >
                    {key}
                  </kbd>
                  <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT.body }}>{label}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
