import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Badge, Button, StatusDot } from '../design/primitives';
import { FONT, INK, PAPER, SURFACE } from '../design/tokens';

/** Locked, lightweight 3D city preview: auto-rotates, no zoom (no scroll hijack). */
export default function DashboardCityPreview({ onLaunch }: { onLaunch: () => void }) {
  const towers = [
    { x: -8, z: -4, w: 7, d: 7, h: 22 },
    { x: 2, z: 3, w: 9, d: 8, h: 34 },
    { x: 12, z: -6, w: 6, d: 6, h: 16 },
    { x: -2, z: -12, w: 8, d: 7, h: 27 },
    { x: 10, z: 11, w: 7, d: 7, h: 20 },
  ];
  return (
    <div style={{ background: SURFACE.panel, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, padding: 0, overflow: 'hidden' }}>
      <div className="flex items-center justify-between" style={{ padding: '10px 14px', borderBottom: `2px solid ${INK}` }}>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: PAPER }}>
          3D Cityscape Preview
        </span>
        <Badge domain="ok"><StatusDot domain="ok" size={7} /> LIVE</Badge>
      </div>
      <div style={{ height: 300, background: '#111111' }}>
        <Canvas
          camera={{ position: [34, 26, 34], fov: 42 }}
          dpr={1}
          gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}
        >
          <color attach="background" args={['#111111']} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[30, 50, 20]} intensity={1.4} color="#ffffff" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
            <planeGeometry args={[90, 90]} />
            <meshStandardMaterial color="#1c1c1c" />
          </mesh>
          <gridHelper args={[90, 45, 0xF5C400, 0x333333]} position={[0, 0, 0]} />
          <Suspense fallback={null}>
            {towers.map((t, i) => (
              <mesh key={i} position={[t.x, t.h / 2, t.z]}>
                <boxGeometry args={[t.w, t.h, t.d]} />
                <meshStandardMaterial color={i === 1 ? '#F5C400' : '#F4F1E8'} roughness={0.85} />
              </mesh>
            ))}
          </Suspense>
          <OrbitControls
            autoRotate
            autoRotateSpeed={1.2}
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 2.4}
            target={[0, 8, 0]}
          />
        </Canvas>
      </div>
      <div style={{ padding: 12, borderTop: `3px solid ${INK}`, background: SURFACE.panel }}>
        <Button domain="record" onClick={onLaunch} style={{ width: '100%', justifyContent: 'center' }}>
          LAUNCH SATELLITE EXPLORER →
        </Button>
      </div>
    </div>
  );
}
