/**
 * SIH26011 - Explorer3D Scene State Hook
 * Manages UI state for the 3D explorer: selection, view mode, filters
 */

import { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import type { Building, Floor, Unit, SpatialID, ViewPreset, LiveHierarchy, BuildingSummary, CityBuilding, OsmBuilding } from '../../workspace3d/types';
import type { Box3, Vec3 } from '../../workspace3d/underground';
import type { Building, Floor, Unit, SpatialID, ViewPreset, LiveHierarchy, BuildingSummary, CityBuilding, OsmBuilding } from '../../workspace3d/types';
import type { Box3, Vec3 } from '../../workspace3d/underground';

interface SceneState {
  // Selection
  selected: Unit | null;
  selectedScope: 'building' | 'floor' | null;
  selectedFloorId: string | null;
  
  // View
  exploded: boolean;
  zMax: number;
  viewPreset: ViewPreset;
  
  // Visibility toggles
  showGrid: boolean;
  showParcel: boolean;
  showFloors: boolean;
  showUnits: boolean;
  showCity: boolean;
  showPipes: boolean;
  showTerrain: boolean;
  showLiveParcels: boolean;
  xray: boolean;
  
  // UI panels
  openPanels: { view: boolean; env: boolean; floor: boolean; val: boolean };
  inspOpen: boolean;
  conflictOpen: boolean;
  mobilePanel: 'inspector' | 'hierarchy' | null;
  
  // Environment
  hourOfDay: number;
  weather: 'clear' | 'clouds' | 'monsoon';
  liveSync: boolean;
  quality: 'low' | 'medium' | 'high';
  lowPower: boolean;
  ilimsMode: boolean;
  splitView: boolean;
  map2DMode: 'satellite' | 'vector';
  
  // Live capture
  liveCaptureMode: boolean;
  liveCaptureLoading: boolean;
  liveCaptureNotice: string | null;
  selectedLiveParcelId: string | null;
  
  // Measure
  measureMode: boolean;
  measurePoints: THREE.Vector3[];
  
  // Interior tour
  interiorTour: boolean;
  
  // Shadow audit
  shadowAudit: boolean;
  dayOfYear: number;
  
  // OSM selection
  osmSelected: string | null;
  osmFloorId: string | null;
  osmUnitId: string | null;
  
  // LIDAR
  lidarTarget: string;
  lidarRunning: boolean;
  lidarJob: { status: string; result?: Record<string, unknown> | null; error?: string | null } | null;
  
  // Temporal
  targetEpochMs: number;
  isHistorical: boolean;
  epochBounds: { min: number; max: number };
  
  // Hover
  hoverBlock: string | null;
  
  // Search/filters
  search: string;
  reportSearch: string;
  ownershipFilter: string;
  minimumMarketValue: number;
  matchingFloorIds: Set<string>;
  reportFilterActive: boolean;
  inspectorFloor: Floor | null;
  inspectorUnits: Unit[];
}

export function useSceneState(
  building: Building,
  floors: Floor[],
  units: Unit[],
  source: 'loading' | 'live' | 'demo',
  liveParcels: Array<{ parcel_id: string; height_m: number; footprint: any; encroachment?: boolean; elevation_msl_m?: number }>
): SceneState & {
  // Actions
  setSelected: (unit: Unit | null) => void;
  setSelectedScope: (scope: 'building' | 'floor' | null) => void;
  setSelectedFloorId: (id: string | null) => void;
  setExploded: (v: boolean) => void;
  setZMax: (v: number) => void;
  setViewPreset: (v: ViewPreset) => void;
  togglePanel: (k: 'view' | 'env' | 'floor' | 'val') => void;
  setShowGrid: (v: boolean) => void;
  setShowParcel: (v: boolean) => void;
  setShowFloors: (v: boolean) => void;
  setShowUnits: (v: boolean) => void;
  setShowCity: (v: boolean) => void;
  setShowPipes: (v: boolean) => void;
  setShowTerrain: (v: boolean) => void;
  setShowLiveParcels: (v: boolean) => void;
  setXray: (v: boolean) => void;
  setInspOpen: (v: boolean) => void;
  setConflictOpen: (v: boolean) => void;
  setMobilePanel: (v: 'inspector' | 'hierarchy' | null) => void;
  setHourOfDay: (v: number) => void;
  setWeather: (v: 'clear' | 'clouds' | 'monsoon') => void;
  setLiveSync: (v: boolean) => void;
  setQuality: (v: 'low' | 'medium' | 'high') => void;
  setLowPower: (v: boolean) => void;
  setIlimsMode: (v: boolean) => void;
  setSplitView: (v: boolean) => void;
  setMap2DMode: (v: 'satellite' | 'vector') => void;
  setLiveCaptureMode: (v: boolean) => void;
  setLiveCaptureLoading: (v: boolean) => void;
  setLiveCaptureNotice: (v: string | null) => void;
  setSelectedLiveParcelId: (id: string | null) => void;
  setMeasureMode: (v: boolean) => void;
  setMeasurePoints: (points: THREE.Vector3[]) => void;
  setInteriorTour: (v: boolean) => void;
  setShadowAudit: (v: boolean) => void;
  setDayOfYear: (v: number) => void;
  setOsmSelected: (id: string | null) => void;
  setOsmFloorId: (id: string | null) => void;
  setOsmUnitId: (id: string | null) => void;
  setLidarTarget: (v: string) => void;
  setLidarRunning: (v: boolean) => void;
  setLidarJob: (job: { status: string; result?: Record<string, unknown> | null; error?: string | null } | null) => void;
  setTargetEpochMs: (v: number) => void;
  setIsHistorical: (v: boolean) => void;
  setHoverBlock: (name: string | null) => void;
  setSearch: (v: string) => void;
  setReportSearch: (v: string) => void;
  setOwnershipFilter: (v: string) => void;
  setMinimumMarketValue: (v: number) => void;
  setInteriorTour: (v: boolean) => void;
  setShadowAudit: (v: boolean) => void;
  setDayOfYear: (v: number) => void;
  flyTo: (v: ViewPreset) => void;
  resetForBuilding: (bldg: Building) => void;
  switchBuilding: (id: string, preset?: ViewPreset) => void;
  selectOsm: (id: string) => void;
  deselectOsm: () => void;
  clearOsm: () => void;
  pushMeasurePoint: (p: THREE.Vector3) => void;
  togglePanel: (k: 'view' | 'env' | 'floor' | 'val') => void;
} {
  // We'll use a single state object to reduce re-renders
  const [state, setState] = useState<Partial<SceneState>>({
    // Selection
    selected: null,
    selectedScope: null,
    selectedFloorId: null,
    
    // View
    exploded: false,
    zMax: 36,
    viewPreset: 'orbit',
    
    // Visibility
    showGrid: true,
    showParcel: true,
    showFloors: true,
    showUnits: true,
    showCity: true,
    showPipes: true,
    showTerrain: true,
    showLiveParcels: true,
    xray: false,
    
    // UI panels
    openPanels: { view: true, env: false, floor: false, val: false },
    inspOpen: true,
    conflictOpen: false,
    mobilePanel: null,
    
    // Environment
    hourOfDay: 12,
    weather: 'clear',
    liveSync: false,
    quality: 'low',
    lowPower: false,
    ilimsMode: false,
    splitView: false,
    map2DMode: 'satellite',
    
    // Live capture
    liveCaptureMode: false,
    liveCaptureLoading: false,
    liveCaptureNotice: null,
    selectedLiveParcelId: null,
    
    // Measure
    measureMode: false,
    measurePoints: [],
    
    // Interior
    interiorTour: false,
    
    // Shadow audit
    shadowAudit: false,
    dayOfYear: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000),
    
    // OSM
    osmSelected: null,
    osmFloorId: null,
    osmUnitId: null,
    
    // LIDAR
    lidarTarget: '',
    lidarRunning: false,
    lidarJob: null,
    
    // Temporal
    targetEpochMs: Date.now(),
    isHistorical: false,
    epochBounds: { min: Date.UTC(2015, 0, 1), max: Date.now() },
    
    // Hover
    hoverBlock: null,
    
    // Search/filters
    search: '',
    reportSearch: '',
    ownershipFilter: 'ALL',
    minimumMarketValue: 0,
    matchingFloorIds: new Set(),
    reportFilterActive: false,
    inspectorFloor: null,
    inspectorUnits: [],
    
    // Computed
    inspectorUnits: [],
    matchingFloorIds: new Set(),
    reportFilterActive: false,
  });

  // Computed values
  const inspectorFloor = state.selectedFloorId 
    ? floors.find((fl) => fl.id === state.selectedFloorId) ?? null
    : state.selected
      ? floors.find((f) => f.id === state.selected?.floor_id) ?? null
      : null;
  
  const inspectorUnits = state.inspectorFloor 
    ? units.filter((u) => u.floor_id === state.inspectorFloor!.id)
    : [];

  const matchingFloorIds = useMemo(() => {
    const query = state.reportSearch.trim().toLowerCase();
    return new Set(floors.filter((floor) => {
      const matchesSearch = state.source === 'live'
        ? !query || `${floor.code} ${floor.label}`.toLowerCase().includes(query)
        : !query || `${floor.code} ${floor.label} ${floor.ownership?.ownerName ?? ''}`.toLowerCase().includes(query);
      if (state.source === 'live') return matchesSearch;
      const matchesOwner = state.ownershipFilter === 'ALL' || floor.ownership?.ownershipType === state.ownershipFilter;
      return matchesSearch && matchesOwner && (floor.valuation?.marketValue ?? 0) >= state.minimumMarketValue;
    }).map((floor) => floor.id));
  }, [floors, state.minimumMarketValue, state.ownershipFilter, state.reportSearch, state.source]);

  const reportFilterActive = Boolean(state.reportSearch.trim() || state.ownershipFilter !== 'ALL' || state.minimumMarketValue > 0);

  // Action creators
  const update = useCallback((patch: Partial<SceneState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const flyTo = useCallback((v: ViewPreset) => {
    update({ viewPreset: v });
  }, [update]);

  const resetForBuilding = useCallback((bldg: Building) => {
    update({
      selected: null,
      selectedFloorId: null,
      selectedScope: null,
      osmSelected: null,
      osmFloorId: null,
      osmUnitId: null,
      reportSearch: '',
      ownershipFilter: 'ALL',
      minimumMarketValue: 0,
      zMax: 36 * (bldg.height_m > 0 ? bldg.height_m / 36 : 1),
    });
  }, [update]);

  const switchBuilding = useCallback((id: string, preset?: ViewPreset) => {
    // This will be handled by the parent component
  }, []);

  const selectOsm = useCallback((id: string) => {
    update({
      osmSelected: id,
      osmFloorId: null,
      osmUnitId: null,
      selected: null,
      selectedFloorId: null,
      selectedScope: null,
      interiorTour: false,
    });
    flyTo('focus');
  }, [update, flyTo]);

  const deselectOsm = useCallback(() => {
    update({ osmSelected: null });
    flyTo('orbit');
  }, [update, flyTo]);

  const clearOsm = useCallback(() => deselectOsm(), [deselectOsm]);

  const pushMeasurePoint = useCallback((p: THREE.Vector3) => {
    update(prev => ({
      measurePoints: prev.measurePoints.length >= 2 ? [p.clone()] : [...prev.measurePoints, p.clone()]
    }));
  }, [update]);

  const togglePanel = useCallback((k: 'view' | 'env' | 'floor' | 'val') => {
    update(prev => ({ openPanels: { ...prev.openPanels, [k]: !prev.openPanels[k] } }));
  }, [update]);

  const flyTo = useCallback((v: ViewPreset) => {
    update({ viewPreset: v });
  }, [update]);

  const resetForBuilding = useCallback((bldg: Building) => {
    update({
      selected: null,
      selectedFloorId: null,
      selectedScope: null,
      osmSelected: null,
      osmFloorId: null,
      osmUnitId: null,
      reportSearch: '',
      ownershipFilter: 'ALL',
      minimumMarketValue: 0,
      zMax: 36 * (bldg.height_m > 0 ? bldg.height_m / 36 : 1),
    });
  }, [update]);

  // Return all state and actions
  return {
    ...state,
    inspectorFloor,
    inspectorUnits,
    matchingFloorIds,
    reportFilterActive,
    // Actions
    setSelected: (unit: Unit | null) => update({ selected: unit }),
    setSelectedScope: (scope: 'building' | 'floor' | null) => update({ selectedScope: scope }),
    setSelectedFloorId: (id: string | null) => update({ selectedFloorId: id }),
    setExploded: (v: boolean) => update({ exploded: v }),
    setZMax: (v: number) => update({ zMax: v }),
    setViewPreset: (v: ViewPreset) => update({ viewPreset: v }),
    setShowGrid: (v: boolean) => update({ showGrid: v }),
    setShowParcel: (v: boolean) => update({ showParcel: v }),
    setShowFloors: (v: boolean) => update({ showFloors: v }),
    setShowUnits: (v: boolean) => update({ showUnits: v }),
    setShowCity: (v: boolean) => update({ showCity: v }),
    setShowPipes: (v: boolean) => update({ showPipes: v }),
    setShowTerrain: (v: boolean) => update({ showTerrain: v }),
    setShowLiveParcels: (v: boolean) => update({ showLiveParcels: v }),
    setXray: (v: boolean) => update({ xray: v }),
    setInspOpen: (v: boolean) => update({ inspOpen: v }),
    setConflictOpen: (v: boolean) => update({ conflictOpen: v }),
    setMobilePanel: (v: 'inspector' | 'hierarchy' | null) => update({ mobilePanel: v }),
    setHourOfDay: (v: number) => update({ hourOfDay: v }),
    setWeather: (v: 'clear' | 'clouds' | 'monsoon') => update({ weather: v }),
    setLiveSync: (v: boolean) => update({ liveSync: v }),
    setQuality: (v: 'low' | 'medium' | 'high') => update({ quality: v }),
    setLowPower: (v: boolean) => update({ lowPower: v }),
    setIlimsMode: (v: boolean) => update({ ilimsMode: v }),
    setSplitView: (v: boolean) => update({ splitView: v }),
    setMap2DMode: (v: 'satellite' | 'vector') => update({ map2DMode: v }),
    setLiveCaptureMode: (v: boolean) => update({ liveCaptureMode: v }),
    setLiveCaptureLoading: (v: boolean) => update({ liveCaptureLoading: v }),
    setLiveCaptureNotice: (v: string | null) => update({ liveCaptureNotice: v }),
    setSelectedLiveParcelId: (id: string | null) => update({ selectedLiveParcelId: id }),
    setMeasureMode: (v: boolean) => update({ measureMode: v }),
    setMeasurePoints: (points: THREE.Vector3[]) => update({ measurePoints: points }),
    setInteriorTour: (v: boolean) => update({ interiorTour: v }),
    setShadowAudit: (v: boolean) => update({ shadowAudit: v }),
    setDayOfYear: (v: number) => update({ dayOfYear: v }),
    setOsmSelected: (id: string | null) => update({ osmSelected: id }),
    setOsmFloorId: (id: string | null) => update({ osmFloorId: id }),
    setOsmUnitId: (id: string | null) => update({ osmUnitId: id }),
    setLidarTarget: (v: string) => update({ lidarTarget: v }),
    setLidarRunning: (v: boolean) => update({ lidarRunning: v }),
    setLidarJob: (job: { status: string; result?: Record<string, unknown> | null; error?: string | null } | null) => update({ lidarJob: job }),
    setTargetEpochMs: (v: number) => update({ targetEpochMs: v }),
    setIsHistorical: (v: boolean) => update({ isHistorical: v }),
    setHoverBlock: (name: string | null) => update({ hoverBlock: name }),
    setSearch: (v: string) => update({ search: v }),
    setReportSearch: (v: string) => update({ reportSearch: v }),
    setOwnershipFilter: (v: string) => update({ ownershipFilter: v }),
    setMinimumMarketValue: (v: number) => update({ minimumMarketValue: v }),
    setInteriorTour: (v: boolean) => update({ interiorTour: v }),
    setShadowAudit: (v: boolean) => update({ shadowAudit: v }),
    setDayOfYear: (v: number) => update({ dayOfYear: v }),
    flyTo,
    resetForBuilding,
    switchBuilding: () => {}, // Handled by parent
    selectOsm,
    deselectOsm,
    clearOsm,
    pushMeasurePoint,
    togglePanel,
    flyTo,
    resetForBuilding,
  };
}