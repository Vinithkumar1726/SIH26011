import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
import * as THREE from 'three';

interface UnitMesh {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  yMin: number;
  yMax: number;
  floor: number;
  color: string;
}

const UNITS: UnitMesh[] = [
  { id: 'U01', x: -1.5, z: -1.0, w: 2.8, d: 2.0, yMin: 0, yMax: 3.2, floor: 1, color: '#C99A45' },
  { id: 'U02', x: 1.5, z: -1.0, w: 2.6, d: 2.0, yMin: 0, yMax: 3.2, floor: 1, color: '#4FB8AC' },
  { id: 'U03', x: -1.5, z: 1.0, w: 2.8, d: 2.0, yMin: 3.2, yMax: 6.4, floor: 2, color: '#4FB8AC' },
  { id: 'U04', x: 1.5, z: 1.0, w: 2.6, d: 2.0, yMin: 3.2, yMax: 6.4, floor: 2, color: '#4FB8AC' },
  { id: 'U05', x: -1.5, z: -1.0, w: 2.8, d: 2.0, yMin: 6.4, yMax: 9.6, floor: 3, color: '#4FB8AC' },
  { id: 'U06', x: 1.5, z: 1.0, w: 2.6, d: 2.0, yMin: 6.4, yMax: 9.6, floor: 3, color: '#4FB8AC' },
];

function UnitBox({
  unit,
  selected,
  onClick,
  explode,
  visMode,
  selectedFloor,
}: {
  unit: UnitMesh;
  selected: boolean;
  onClick: () => void;
  explode: boolean;
  visMode: string;
  selectedFloor: number | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  const floorOffset = explode ? (unit.floor - 1) * 2 : 0;
  const height = unit.yMax - unit.yMin;
  const cy = unit.yMin + height / 2 + floorOffset;

  const isVisible = selectedFloor === null || selectedFloor === unit.floor;
  if (!isVisible) return null;

  const opacity = visMode === 'transparent' ? 0.25 : visMode === 'wireframe' ? 0.1 : 0.65;
  const isWire = visMode === 'wireframe';

  const baseColor = selected ? '#C99A45' : hovered ? '#D4AE6A' : unit.color;

  return (
    <mesh
      ref={meshRef}
      position={[unit.x, cy, unit.z]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[unit.w, height, unit.d]} />
      <meshStandardMaterial
        color={baseColor}
        transparent
        opacity={opacity}
        wireframe={isWire}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
}

function WireframeBox({ unit, explode }: { unit: UnitMesh; explode: boolean }) {
  const floorOffset = explode ? (unit.floor - 1) * 2 : 0;
  const height = unit.yMax - unit.yMin;
  const cy = unit.yMin + height / 2 + floorOffset;

  const hw = unit.w / 2, hh = height / 2, hd = unit.d / 2;
  const x = unit.x, y = cy, z = unit.z;

  const corners: [number, number, number][] = [
    [x - hw, y - hh, z - hd], [x + hw, y - hh, z - hd],
    [x + hw, y - hh, z + hd], [x - hw, y - hh, z + hd],
    [x - hw, y + hh, z - hd], [x + hw, y + hh, z - hd],
    [x + hw, y + hh, z + hd], [x - hw, y + hh, z + hd],
  ];

  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ] as [number, number][];

  return (
    <>
      {edges.map(([a, b], i) => (
        <Line
          key={i}
          points={[corners[a], corners[b]]}
          color="#28313C"
          lineWidth={0.5}
        />
      ))}
    </>
  );
}

function ParcelOutline() {
  const pts: [number, number, number][] = [
    [-4, 0, -3.5], [4, 0, -3.5],
    [4, 0, 3.5], [-4, 0, 3.5], [-4, 0, -3.5],
  ];
  return <Line points={pts} color="#C99A45" lineWidth={1} dashed dashSize={0.3} gapSize={0.15} />;
}

function ElevationLabels({ explode }: { explode: boolean }) {
  const floors = [0, 3.2, 6.4, 9.6];
  return (
    <>
      {floors.map((h, i) => {
        const offset = explode ? Math.floor(i) * 2 : 0;
        return (
          <Line
            key={i}
            points={[[-5, h + offset, 0] as [number, number, number], [-4.2, h + offset, 0] as [number, number, number]]}
            color="#6E7783"
            lineWidth={0.5}
          />
        );
      })}
    </>
  );
}

interface Props {
  selectedUnit?: string | null;
  onSelectUnit?: (id: string | null) => void;
  explode?: boolean;
  visMode?: string;
  selectedFloor?: number | null;
}

export default function Building3D({
  selectedUnit = null,
  onSelectUnit,
  explode = false,
  visMode = 'solid',
  selectedFloor = null,
}: Props) {
  return (
    <Canvas
      camera={{ position: [10, 8, 10], fov: 40, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: '#0D1219' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[8, 12, 8]} intensity={0.8} color="#F1F3F5" />
      <directionalLight position={[-6, 4, -6]} intensity={0.3} color="#4FB8AC" />
      <pointLight position={[0, 12, 0]} intensity={0.3} color="#C99A45" />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#1B222C"
        sectionSize={4}
        sectionThickness={0.8}
        sectionColor="#28313C"
        fadeDistance={30}
        position={[0, -0.01, 0]}
      />

      <ParcelOutline />
      <ElevationLabels explode={explode} />

      {UNITS.map((unit) => (
        <>
          <UnitBox
            key={unit.id}
            unit={unit}
            selected={selectedUnit === unit.id}
            onClick={() => onSelectUnit?.(selectedUnit === unit.id ? null : unit.id)}
            explode={explode}
            visMode={visMode}
            selectedFloor={selectedFloor}
          />
          <WireframeBox key={`wire-${unit.id}`} unit={unit} explode={explode} />
        </>
      ))}

      <OrbitControls
        enablePan
        enableZoom
        minDistance={3}
        maxDistance={40}
        target={[0, 3, 0]}
      />
    </Canvas>
  );
}
