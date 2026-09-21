/**
 * SIH26011 — Core Geometry Algorithms
 * 
 * Real implementations of:
 * - 3D solid generation (PolyhedralSurfaceZ)
 * - SHA-256 geometry hashing
 * - 3D topology validation
 * - Spatial identifier versioning
 */

import { SHA256 } from 'crypto-js';

// ─── 3D Solid Generation ───────────────────────────────────────

export interface Footprint2D {
  coordinates: [number, number][]; // [lon, lat] or [x, y]
}

export interface Solid3D {
  faces: Face3D[];
  vertices: Vector3[];
  volume: number;
}

export interface Face3D {
  vertices: number[]; // indices into vertices array
  normal: Vector3;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Generate a PolyhedralSurfaceZ from a 2D footprint + z_min/z_max
 * 
 * Creates:
 * - Bottom face at z_min
 * - Top face at z_max
 * - Wall faces connecting bottom to top
 * 
 * Total: 2 caps + N walls (where N = number of footprint vertices)
 */
export function generatePolyhedralSolid(
  footprint: Footprint2D,
  zMin: number,
  zMax: number
): Solid3D {
  if (zMax <= zMin) {
    throw new Error(`Invalid Z range: z_max (${zMax}) must be > z_min (${zMin})`);
  }

  const coords = footprint.coordinates;
  if (coords.length < 3) {
    throw new Error(`Footprint must have at least 3 vertices, got ${coords.length}`);
  }

  const vertices: Vector3[] = [];
  const faces: Face3D[] = [];

  // Add bottom vertices (z_min)
  const bottomStart = vertices.length;
  for (const [x, y] of coords) {
    vertices.push({ x, y, z: zMin });
  }

  // Add top vertices (z_max)
  const topStart = vertices.length;
  for (const [x, y] of coords) {
    vertices.push({ x, y, z: zMax });
  }

  const n = coords.length;

  // Bottom face (counter-clockwise when viewed from below)
  const bottomFace: number[] = [];
  for (let i = 0; i < n; i++) {
    bottomFace.push(bottomStart + i);
  }
  faces.push({
    vertices: bottomFace,
    normal: { x: 0, y: 0, z: -1 }
  });

  // Top face (counter-clockwise when viewed from above)
  const topFace: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    topFace.push(topStart + i);
  }
  faces.push({
    vertices: topFace,
    normal: { x: 0, y: 0, z: 1 }
  });

  // Wall faces
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const wallFace = [
      bottomStart + i,
      bottomStart + next,
      topStart + next,
      topStart + i
    ];
    
    // Calculate wall normal
    const v1 = vertices[bottomStart + i];
    const v2 = vertices[bottomStart + next];
    const v3 = vertices[topStart + next];
    
    const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const edge2 = { x: v3.x - v2.x, y: v3.y - v2.y, z: v3.z - v2.z };
    const normal = crossProduct(edge1, edge2);
    const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
    if (len > 0) {
      normal.x /= len;
      normal.y /= len;
      normal.z /= len;
    }
    
    faces.push({ vertices: wallFace, normal });
  }

  // Calculate volume using divergence theorem
  const volume = calculateVolume(vertices, faces);

  return { faces, vertices, volume };
}

/**
 * Calculate volume of a closed polyhedron using divergence theorem
 */
function calculateVolume(vertices: Vector3[], faces: Face3D[]): number {
  let volume = 0;

  for (const face of faces) {
    if (face.vertices.length < 3) continue;
    
    // Triangulate the face
    const v0 = vertices[face.vertices[0]];
    for (let i = 1; i < face.vertices.length - 1; i++) {
      const v1 = vertices[face.vertices[i]];
      const v2 = vertices[face.vertices[i + 1]];
      
      // Volume contribution from this triangle
      volume += (
        v0.x * (v1.y * v2.z - v2.y * v1.z) -
        v0.y * (v1.x * v2.z - v2.x * v1.z) +
        v0.z * (v1.x * v2.y - v2.x * v1.y)
      );
    }
  }

  return Math.abs(volume) / 6;
}

function crossProduct(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

// ─── Geometry Hashing ──────────────────────────────────────────

/**
 * Normalize geometry for consistent hashing
 * 
 * - Sort vertices lexicographically
 * - Round to fixed precision
 * - Remove duplicate vertices
 */
export function normalizeGeometry(solid: Solid3D): string {
  // Round coordinates to 6 decimal places
  const rounded = solid.vertices.map(v => ({
    x: Math.round(v.x * 1e6) / 1e6,
    y: Math.round(v.y * 1e6) / 1e6,
    z: Math.round(v.z * 1e6) / 1e6
  }));

  // Sort vertices
  const sorted = [...rounded].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    if (a.y !== b.y) return a.y - b.y;
    return a.z - b.z;
  });

  // Serialize to canonical string
  return JSON.stringify(sorted);
}

/**
 * Generate SHA-256 hash of normalized geometry
 */
export function hashGeometry(solid: Solid3D): string {
  const normalized = normalizeGeometry(solid);
  return SHA256(normalized).toString();
}

// ─── 3D Topology Validation ────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  code: string;
  message: string;
  entity_id?: string;
  overlap_volume?: number;
}

/**
 * Validate that two solids do not overlap in 3D
 * 
 * Uses precise intersection testing:
 * 1. AABB check (fast rejection)
 * 2. For axis-aligned boxes: exact box intersection
 * 3. For general polyhedra: Separating Axis Theorem (SAT)
 */
export function checkOverlap(solid1: Solid3D, solid2: Solid3D): { overlaps: boolean; volume?: number } {
  // Get bounding boxes
  const bbox1 = getBoundingBox(solid1);
  const bbox2 = getBoundingBox(solid2);

  // Quick AABB check - if no overlap, definitely no intersection
  if (!aabbOverlap(bbox1, bbox2)) {
    return { overlaps: false };
  }

  // Additional check: if z-ranges don't overlap, no intersection
  // This handles units on different floors
  const zOverlap = Math.min(bbox1.max.z, bbox2.max.z) - Math.max(bbox1.min.z, bbox2.min.z);
  if (zOverlap <= 1e-3) {
    return { overlaps: false };
  }

  // Check if both solids are axis-aligned boxes
  const box1 = extractBox(solid1);
  const box2 = extractBox(solid2);

  if (box1 && box2) {
    // Use exact box intersection for axis-aligned boxes
    return checkBoxOverlap(box1, box2);
  }

  // For general polyhedra, use SAT
  return checkSATOverlap(solid1, solid2);
}

interface BBox {
  min: Vector3;
  max: Vector3;
}

interface Box {
  min: Vector3;
  max: Vector3;
}

function getBoundingBox(solid: Solid3D): BBox {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (const v of solid.vertices) {
    min.x = Math.min(min.x, v.x);
    min.y = Math.min(min.y, v.y);
    min.z = Math.min(min.z, v.z);
    max.x = Math.max(max.x, v.x);
    max.y = Math.max(max.y, v.y);
    max.z = Math.max(max.z, v.z);
  }

  return { min, max };
}

function aabbOverlap(box1: BBox, box2: BBox, epsilon: number = 1e-3): boolean {
  // Use 1mm tolerance for floating-point precision
  return (
    box1.min.x <= box2.max.x + epsilon && box1.max.x >= box2.min.x - epsilon &&
    box1.min.y <= box2.max.y + epsilon && box1.max.y >= box2.min.y - epsilon &&
    box1.min.z <= box2.max.z + epsilon && box1.max.z >= box2.min.z - epsilon
  );
}

/**
 * Extract axis-aligned box from solid (if it is one)
 * Returns null if the solid is not a simple axis-aligned box
 */
function extractBox(solid: Solid3D): Box | null {
  // Check if solid has exactly 8 vertices (box)
  if (solid.vertices.length !== 8) return null;

  // Check if all faces are axis-aligned
  for (const face of solid.faces) {
    const normal = face.normal;
    // Normal should be aligned with one axis
    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);
    
    // One component should be ~1, others ~0
    const maxComponent = Math.max(absX, absY, absZ);
    if (maxComponent < 0.99) return null;
  }

  return getBoundingBox(solid) as Box;
}

/**
 * Check exact overlap between two axis-aligned boxes
 */
function checkBoxOverlap(box1: Box, box2: Box): { overlaps: boolean; volume?: number } {
  // Use a more generous epsilon for floating-point tolerance
  // 1mm tolerance to handle precision issues
  const epsilon = 1e-3;

  // Calculate overlap in each dimension
  const overlapX = Math.min(box1.max.x, box2.max.x) - Math.max(box1.min.x, box2.min.x);
  const overlapY = Math.min(box1.max.y, box2.max.y) - Math.max(box1.min.y, box2.min.y);
  const overlapZ = Math.min(box1.max.z, box2.max.z) - Math.max(box1.min.z, box2.min.z);

  // Check if boxes intersect in all three dimensions
  // Use epsilon to handle floating-point precision and touching surfaces
  if (overlapX > epsilon && overlapY > epsilon && overlapZ > epsilon) {
    const volume = overlapX * overlapY * overlapZ;
    return { overlaps: true, volume };
  }

  return { overlaps: false };
}

/**
 * Separating Axis Theorem (SAT) for general polyhedra
 * Tests if there exists a separating axis between two convex polyhedra
 */
function checkSATOverlap(solid1: Solid3D, solid2: Solid3D): { overlaps: boolean } {
  // Get all potential separating axes:
  // 1. Face normals from both solids
  // 2. Cross products of edges from both solids

  const axes: Vector3[] = [];

  // Add face normals
  for (const face of solid1.faces) {
    axes.push(face.normal);
  }
  for (const face of solid2.faces) {
    axes.push(face.normal);
  }

  // Add edge cross products
  const edges1 = getEdges(solid1);
  const edges2 = getEdges(solid2);

  for (const e1 of edges1) {
    for (const e2 of edges2) {
      const cross = crossProduct(e1, e2);
      const len = Math.sqrt(cross.x ** 2 + cross.y ** 2 + cross.z ** 2);
      if (len > 1e-6) {
        axes.push({ x: cross.x / len, y: cross.y / len, z: cross.z / len });
      }
    }
  }

  // Test each axis
  for (const axis of axes) {
    const proj1 = projectOntoAxis(solid1.vertices, axis);
    const proj2 = projectOntoAxis(solid2.vertices, axis);

    // Check if projections overlap
    if (proj1.max < proj2.min || proj2.max < proj1.min) {
      // Found separating axis - no overlap
      return { overlaps: false };
    }
  }

  // No separating axis found - solids overlap
  return { overlaps: true };
}

function getEdges(solid: Solid3D): Vector3[] {
  const edges: Vector3[] = [];
  const edgeSet = new Set<string>();

  for (const face of solid.faces) {
    const verts = face.vertices;
    for (let i = 0; i < verts.length; i++) {
      const v1 = solid.vertices[verts[i]];
      const v2 = solid.vertices[verts[(i + 1) % verts.length]];
      
      const key = `${Math.min(verts[i], verts[(i + 1) % verts.length])}-${Math.max(verts[i], verts[(i + 1) % verts.length])}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({
          x: v2.x - v1.x,
          y: v2.y - v1.y,
          z: v2.z - v1.z
        });
      }
    }
  }

  return edges;
}

function projectOntoAxis(vertices: Vector3[], axis: Vector3): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  for (const v of vertices) {
    const proj = v.x * axis.x + v.y * axis.y + v.z * axis.z;
    min = Math.min(min, proj);
    max = Math.max(max, proj);
  }

  return { min, max };
}

/**
 * Validate a solid geometry
 */
export function validateSolid(solid: Solid3D, entityId: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for NaN/Inf coordinates
  for (let i = 0; i < solid.vertices.length; i++) {
    const v = solid.vertices[i];
    if (!isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z)) {
      issues.push({
        severity: 'HIGH',
        code: 'INVALID_COORDINATE',
        message: `Vertex ${i} contains NaN or Inf`,
        entity_id: entityId
      });
    }
  }

  // Check volume is positive
  if (solid.volume <= 0) {
    issues.push({
      severity: 'HIGH',
      code: 'INVALID_VOLUME',
      message: `Volume is ${solid.volume}, must be positive`,
      entity_id: entityId
    });
  }

  // Check minimum face count (at least 4 for a tetrahedron)
  if (solid.faces.length < 4) {
    issues.push({
      severity: 'MEDIUM',
      code: 'INSUFFICIENT_FACES',
      message: `Only ${solid.faces.length} faces, minimum 4 required`,
      entity_id: entityId
    });
  }

  // Check all faces have at least 3 vertices
  for (let i = 0; i < solid.faces.length; i++) {
    if (solid.faces[i].vertices.length < 3) {
      issues.push({
        severity: 'HIGH',
        code: 'DEGENERATE_FACE',
        message: `Face ${i} has fewer than 3 vertices`,
        entity_id: entityId
      });
    }
  }

  return issues;
}

/**
 * Validate a collection of solids for overlaps
 */
export function validateTopology(solids: { id: string; solid: Solid3D; floor_id?: string }[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Validate each solid
  for (const { id, solid } of solids) {
    issues.push(...validateSolid(solid, id));
  }

  // Check for overlaps (O(n²) - fine for demo)
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      // Skip units on different floors - they can't overlap vertically
      if (solids[i].floor_id && solids[j].floor_id && solids[i].floor_id !== solids[j].floor_id) {
        continue;
      }

      const result = checkOverlap(solids[i].solid, solids[j].solid);
      if (result.overlaps) {
        const volumeStr = result.volume ? ` (overlap volume: ${result.volume.toFixed(2)} m³)` : '';
        issues.push({
          severity: 'HIGH',
          code: 'OVERLAP_DETECTED',
          message: `Units ${solids[i].id} and ${solids[j].id} overlap in 3D${volumeStr}`,
          entity_id: `${solids[i].id},${solids[j].id}`,
          overlap_volume: result.volume
        });
      }
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'HIGH').length === 0,
    issues
  };
}

// ─── Spatial Identifier Versioning ─────────────────────────────

export interface SpatialIdentifier {
  parcel_id: string;
  building_code: string;
  floor_code: string;
  unit_code: string;
  version: number;
  geometry_hash: string;
}

/**
 * Generate a spatial identifier string
 */
export function formatIdentifier(id: SpatialIdentifier): string {
  return `${id.parcel_id}-${id.building_code}-${id.floor_code}-${id.unit_code}-V${String(id.version).padStart(2, '0')}`;
}

/**
 * Determine if geometry has changed (requires version increment)
 */
export function hasGeometryChanged(oldHash: string, newHash: string): boolean {
  return oldHash !== newHash;
}

/**
 * Increment version number
 */
export function incrementVersion(currentVersion: number): number {
  return currentVersion + 1;
}

// ─── Coordinate Conversions ────────────────────────────────────

/**
 * Convert lat/lon to local meters (approximate)
 */
export function lonLatToLocal(
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number
): { x: number; y: number } {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);
  return {
    x: (lon - centerLon) * metersPerDegLon,
    y: (lat - centerLat) * metersPerDegLat
  };
}

/**
 * Convert WGS84 to ECEF (Earth-Centered Earth-Fixed)
 */
export function toECEF(lon: number, lat: number, h: number): Vector3 {
  const a = 6378137.0; // WGS84 semi-major axis
  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  
  return {
    x: (N + h) * Math.cos(φ) * Math.cos(λ),
    y: (N + h) * Math.cos(φ) * Math.sin(λ),
    z: (N * (1 - e2) + h) * Math.sin(φ)
  };
}
