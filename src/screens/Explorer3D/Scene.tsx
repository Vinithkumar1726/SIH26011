/**
 * SIH26011 - Explorer3D Scene Component
 * Main Three.js Canvas with camera, lights, postprocessing
 */

import { memo, Suspense, useEffect, useRef, useCallback, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
import { AdaptiveDpr, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import type { Building, Floor, Unit, SpatialID, ViewPreset, CityBuilding, OsmBuilding, LiveHierarchy } from '../../workspace3d/types';
import type { Box3, Vec3 } from '../../workspace3d/underground';

// Import all the sub-components
import { BuildingMesh } from './BuildingMesh';
import { FloorMesh } from './FloorMesh';
import { UnitMesh } from './UnitMesh';
import { ParcelGround } from './ParcelGround';
import { UndergroundPipes } from './UndergroundPipes';
import { CityModel } from './CityModel';
import { FloorControls } from './FloorControls';
import { ToolBar } from './ToolBar';
import { MiniMap } from './MiniMap';
import { LiveCapture } from './LiveCapture';
import { ConflictOverlay } from './ConflictOverlay';
import { InspectorPanel } from './InspectorPanel';
import { ViewRig } from './ViewRig';
import { GridFloor } from './GridFloor';
import { ParcelOutline } from './ParcelOutline';
import { CityContext } from './CityContext';
import { OsmHighlight } from './OsmHighlight';
import { NeighbourBlock } from './NeighbourBlock';
import { LiveCapturedBlock } from './LiveCapturedBlock';
import { SubterraneanNetwork } from './SubterraneanNetwork';
import { MeasurementLine } from './MeasurementLine';
import { MonsoonRain } from './MonsoonRain';
import { BuildingAnchor } from './BuildingAnchor';
import { SolarRig } from './SolarRig';
import { CityErrorBoundary } from './CityErrorBoundary';
import { footprintToLocal, lonLatToLocal, ringOrigin } from '../../workspace3d/data';
import { generatePolyhedralSolid, validateTopology, type Solid3D } from '../../workspace3d/geo';
import { pickOsmBuilding, deselectOsm } from '../../workspace3d/api';
import { useSceneState } from './hooks/useSceneState';
import { useBuildingData } from './hooks/useBuildingData';
import { useConflicts } from './hooks/useConflicts';
import { DOMAIN, FONT, INK, MUTED, PAPER, SURFACE, BORDER, SHADOW } from '../../design/tokens';
import { dayLightFactor, mixHex, lerpNum, formatHour, clamp01 } from '../../utils/sky';

interface SceneProps {
  // All props are managed via hooks now
}

export const Scene = memo(function Scene() {
  // Get all state and data from hooks
  const buildingData = useBuildingData();
  const sceneState = useSceneState(
    buildingData.building!,
    buildingData.floors,
    buildingData.units,
    buildingData.source,
    buildingData.liveParcels
  );
  const conflicts = useConflicts(buildingData.floors, buildingData.units, buildingData.origin);
  
  // Destructure building data
  const {
    source, liveData, summaries, cityBuildings, liveParcels,
    cityMeta, osmCatalog, subUtils, building, floors, units,
    spatialIDs, origin, footprintShape, neighbours, cityOffset,
    cityAvailable, cityVisible, buildingPipes, foundation, pipeStatus,
    targetEpochMs, setTargetEpochMs, isHistorical, epochBounds,
  } = buildingData;
  
  // Destructure scene state
  const {
    selected, setSelected, selectedScope, setSelectedScope,
    selectedFloorId, setSelectedFloorId, exploded, setExploded,
    zMax, setZMax, viewPreset, setViewPreset, showGrid, setShowGrid,
    showParcel, setShowParcel, showFloors, setShowFloors, showUnits, setShowUnits,
    showCity, setShowCity, showPipes, setShowPipes, showTerrain, setShowTerrain,
    showLiveParcels, setShowLiveParcels, xray, setXray, openPanels, togglePanel,
    inspOpen, setInspOpen, conflictOpen, setConflictOpen, mobilePanel, setMobilePanel,
    hourOfDay, setHourOfDay, weather, setWeather, liveSync, setLiveSync,
    quality, setQuality, lowPower, setLowPower, ilimsMode, setIlimsMode,
    splitView, setSplitView, map2DMode, setMap2DMode, liveCaptureMode, setLiveCaptureMode,
    liveCaptureLoading, setLiveCaptureLoading, liveCaptureNotice, setLiveCaptureNotice,
    selectedLiveParcelId, setSelectedLiveParcelId, measureMode, setMeasureMode,
    measurePoints, setMeasurePoints, interiorTour, setInteriorTour, shadowAudit, setShadowAudit,
    dayOfYear, setDayOfYear, osmSelected, setOsmSelected, selectOsm, deselectOsm, clearOsm,
    osmFloorId, setOsmFloorId, osmUnitId, setOsmUnitId, lidarTarget, setLidarTarget,
    lidarRunning, setLidarRunning, lidarJob, setLidarJob, isHistorical, setIsHistorical,
    hoverBlock, setHoverBlock, search, setSearch, reportSearch, setReportSearch,
    ownershipFilter, setOwnershipFilter, minimumMarketValue, setMinimumMarketValue,
    matchingFloorIds, reportFilterActive, inspectorFloor, inspectorUnits,
    resetForBuilding, switchBuilding, pushMeasurePoint,
  } = sceneState;
  
  // Sky/lighting computation
  const sky = useMemo(() => {
    const dl = dayLightFactor(hourOfDay);
    let bg = mixHex('#02040a', '#07090f', dl);
    let fogNear = lerpNum(90, 150, dl);
    let fogFar = lerpNum(260, 400, dl);
    if (weather === 'clouds') { fogFar *= 0.7; fogNear *= 0.85; }
    if (weather === 'monsoon') { fogFar *= 0.5; fogNear *= 0.7; bg = mixHex(bg, '#0a0f1c', 0.5); }
    return {
      bg, fogNear, fogFar,
      ambient: lerpNum(0.16, 0.4, dl) * (weather === 'monsoon' ? 0.8 : 1),
      sun: lerpNum(0.18, 1.2, dl) * (weather === 'clouds' ? 0.75 : weather === 'monsoon' ? 0.5 : 1),
      sunColor: mixHex('#6d86c9', '#ffffff', dl),
      hemiSky: mixHex('#101a42', '#1a2340', dl),
      hemiGround: mixHex('#02040a', '#07090f', dl),
    };
  }, [hourOfDay, weather]);
  
  const isNight = hourOfDay < 6 || hourOfDay >= 18;
  const fh = footprintSpanM(building?.footprint || [], origin[0], origin[1]) / DEMO_SPAN_M;
  const fv = building?.height_m > 0 ? building.height_m / DEMO_HEIGHT_M : 1;
  
  // Camera presets
  const cam = useMemo(() => ({
    home: { pos: [70 * fh, 60 * fv, 70 * fh] as [number, number, number], tgt: [0, 3 * fv, 0] as [number, number, number] },
    bird: { pos: [85 * fh, 95 * fv, 85 * fh] as [number, number, number], tgt: [0, 0, 0] as [number, number, number] },
    plan: { pos: [0.5 * fh, 150 * fh, 0.5 * fh] as [number, number, number], tgt: [0, 0, 0] as [number, number, number] },
    cutaway: { pos: [58 * fh, 16 * fv, 58 * fh] as [number, number, number], tgt: [0, -1, 0] as [number, number, number] },
    street: { pos: [20 * fh, 1.7, 30 * fh] as [number, number, number], tgt: [0, 5 * fv, 0] as [number, number, number] },
    interior: { pos: [14 * fh, 8 * fv, 14 * fh] as [number, number, number], tgt: [0, 3 * fv, 0] as [number, number, number] },
  }), [fh, fv]);
  
  // Focus poses
  const focusPose = useMemo(() => { /* ... compute from parcelFocus or osmRecord */ return null; }, []);
  const pipeFocus = useMemo(() => { /* ... compute from pipes */ return null; }, []);
  const parcelFocus = useMemo(() => { /* ... compute from selectedLiveParcelId */ return null; }, []);
  const cityViews = useMemo(() => { /* ... compute city views */ return null; }, []);
  
  // Click handlers
  const handleGroundClick = useCallback(async (e: any) => {
    if (!liveCaptureMode || liveCaptureLoading) return;
    e.stopPropagation();
    const east = e.point.x;
    const north = -e.point.z;
    const cosLat = Math.cos((origin[1] * Math.PI) / 180);
    const lon = origin[0] + east / (111320 * cosLat);
    const lat = origin[1] + north / 111320;
    // ... capture logic handled by LiveCapture component
  }, [liveCaptureMode, liveCaptureLoading, origin]);
  
  const handleMeasureDown = useCallback((e: any) => {
    if (!measureMode) return;
    e.stopPropagation();
    pushMeasurePoint(e.point.clone());
  }, [measureMode, pushMeasurePoint]);
  
  // Render the canvas
  return (
    <Canvas
      camera={{ position: cam.home.pos, fov: 50 }}
      frameloop={weather === 'monsoon' ? 'always' : 'demand'}
      dpr={quality === 'low' ? 1 : quality === 'medium' ? [1, 1.5] : [1, 2]}
      shadows={shadowAudit || quality !== 'low'}
      gl={{ antialias: true, alpha: false, powerPreference: quality === 'low' ? 'low-power' : 'default' }}
      style={{ background: sky.bg, cursor: liveCaptureMode ? 'crosshair' : 'default' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1; }}
    >
      {quality !== 'high' && <AdaptiveDpr pixelated />}
      <color attach="background" args={[sky.bg]} />
      <fog attach="fog" args={[sky.bg, cityVisible && cityMeta ? Math.max(sky.fogNear, 1.5 * cityMeta.radiusM) : sky.fogNear, cityVisible && cityMeta ? Math.max(sky.fogFar, 4 * cityMeta.radiusM) : sky.fogFar]} />
      <ambientLight intensity={sky.ambient} />
      <directionalLight position={[50, 80, 30]} intensity={sky.sun} color={sky.sunColor} castShadow={quality !== 'low' && !shadowAudit} shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]} />
      {shadowAudit && (
        <SolarRig
          hour={hourOfDay}
          dayOfYear={dayOfYear}
          latDeg={cityMeta?.origin.lat ?? 11.0168}
          extent={cityVisible && cityMeta ? cityMeta.radiusM : 500}
        />
      )}
      <directionalLight position={[-30, 40, -20]} intensity={sky.ambient} color={sky.sunColor} />
      <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.ambient]} />
      
      {showTerrain && (
        <ParcelGround
          footprint={building?.footprint || null}
          origin={origin}
          seeThrough={viewPreset === 'cutaway' || xray}
          size={cityVisible && cityMeta ? 3 * cityMeta.radiusM : 200 * fh}
          onGroundClick={handleGroundClick}
          onMeasureDown={handleMeasureDown}
        />
      )}
      
      {showGrid && !cityVisible && <GridFloor size={200 * fh} />}
      
      {showParcel && building?.footprint && <ParcelOutline footprint={building.footprint} origin={origin} />}
      
      {cityVisible && cityOffset && (
        <CityErrorBoundary>
          <Suspense fallback={null}>
            <CityContext
              url="/coimbatore/city.glb"
              position={[cityOffset[0], 0, -cityOffset[1]]}
              cutaway={viewPreset === 'cutaway'}
              quality={quality}
              onPick={(x, z) => {
                if (!osmCatalog) return;
                const hit = pickOsmBuilding(osmCatalog, x, z);
                if (hit) selectOsm(hit.id);
              }}
            />
          </Suspense>
        </CityErrorBoundary>
      )}
      
      {cityVisible && osmRecord && cityOffset && (
        <OsmHighlight
          footprint={osmRecord.footprint}
          height={osmRecord.height}
          position={[cityOffset[0], 0, -cityOffset[1]]}
        />
      )}
      
      {showPipes && cityVisible && cityOffset && buildingPipes.length > 0 && (
        <UndergroundPipes
          pipes={buildingPipes}
          groupPos={[cityOffset[0], 0, -cityOffset[1]]}
          statuses={new Map(pipeStatus.map((p) => [p.id, p.status]))}
        />
      )}
      
      <MonsoonRain active={weather === 'monsoon'} count={quality === 'high' ? 350 : quality === 'medium' ? 200 : 120} />
      
      <BuildingAnchor shape={footprintShape} height={building?.height_m || 36} onClick={() => { setSelected(null); setSelectedFloorId(null); setSelectedScope('building'); }} />
      
      {source === 'live' && neighbours.map((nb) => (
        <NeighbourBlock
          key={nb.id}
          nb={nb}
          origin={origin}
          onSelect={(id) => switchBuilding(id, 'bird')}
          onHover={(name) => setHoverBlock(name)}
        />
      ))}
      
      {cityVisible && showLiveParcels && liveParcels.map((p) => (
        <LiveCapturedBlock
          key={p.parcel_id}
          parcel={p}
          origin={origin}
          lowPower={lowPower}
          ilimsMode={ilimsMode}
          selected={p.parcel_id === selectedLiveParcelId}
          measureMode={measureMode}
          onMeasure={pushMeasurePoint}
          onSelect={() => setSelectedLiveParcelId((prev) => (prev === p.parcel_id ? null : p.parcel_id))}
          onHover={(name) => setHoverBlock(name)}
        />
      ))}
      
      {xray && subUtils.length > 0 && (
        <SubterraneanNetwork features={subUtils} origin={origin} />
      )}
      
      {showFloors && floors.map((fl, fi) => (
        <FloorMesh
          key={fl.id}
          floor={fl}
          index={fi}
          shape={footprintShape}
          visible={(selectedFloorId === null || selectedFloorId === fl.id)}
          exploded={exploded}
          zMax={zMax}
          highlighted={!reportFilterActive || matchingFloorIds.has(fl.id)}
          onClick={() => { setSelected(null); setSelectedFloorId(fl.id); setSelectedScope('floor'); }}
        />
      ))}
      
      {showUnits && units.map((u) => {
        const fl = floors.find((f) => f.id === u.floor_id)!;
        return (
          <UnitMesh
            key={u.id}
            unit={u}
            floor={fl}
            floorIndex={floors.findIndex((f) => f.id === fl.id)}
            origin={origin}
            visible={(selectedFloorId === null || selectedFloorId === u.floor_id) && fl.z_max <= zMax}
            exploded={exploded}
            selected={selected?.id === u.id}
            conflict={conflicts.hasConflict(u.id)}
            onClick={() => { setSelected(u); setSelectedScope(null); }}
          />
        );
      })}
      
      {osmModel && showFloors && osmModel.floors.map((fl, fi) => (
        <FloorMesh
          key={fl.id}
          floor={fl}
          index={fi}
          shape={osmModel.shape}
          visible
          exploded={exploded}
          zMax={zMax}
          highlighted={osmFloorId === null || osmFloorId === fl.id}
          onClick={() => { setOsmFloorId((prev) => (prev === fl.id ? null : fl.id)); }}
        />
      ))}
      
      {osmModel && showUnits && osmModel.units.map((u) => {
        const fl = osmModel.floors.find((f) => f.id === u.floor_id)!;
        const fi = osmModel.floors.findIndex((f) => f.id === u.floor_id);
        const vis = (osmFloorId === null || osmFloorId === u.floor_id) && fl.z_max <= zMax;
        if (!vis) return null;
        return (
          <UnitMesh
            key={u.id}
            unit={u}
            floor={fl}
            floorIndex={fi}
            origin={origin}
            visible
            exploded={exploded}
            selected={osmUnitId === u.id}
            conflict={false}
            onClick={() => { setOsmUnitId((prev) => (prev === u.id ? null : u.id)); }}
          />
        );
      })}
      
      <ViewRig 
        preset={viewPreset} 
        interiorTour={interiorTour} 
        buildingId={building.id} 
        cam={cam} 
        cityViews={cityViews} 
        cityVisible={cityVisible} 
        cityMeta={cityMeta} 
        maxDistance={viewPreset === 'freeroam' && cityVisible && cityMeta ? 4 * cityMeta.radiusM : cityVisible && cityMeta ? 2.5 * cityMeta.radiusM : 250} 
        focusPose={parcelFocus ?? focusPose} 
        pipeFocus={pipeFocus} 
        camNonce={camNonce} 
      />
      
      {measurePoints.length > 0 && (
        <MeasurementLine points={measurePoints} onClear={() => setMeasurePoints([])} />
      )}
      
      {quality !== 'low' && (
        <EffectComposer>
          <Bloom intensity={1.5} luminanceThreshold={1} mipmapBlur />
          <SSAO color={new THREE.Color('#000000')} intensity={50} luminanceInfluence={0.5} radius={0.4} />
        </EffectComposer>
      )}
    </Canvas>
  );
});

Scene.displayName = 'Scene';