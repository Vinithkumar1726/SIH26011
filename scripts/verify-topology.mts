/**
 * Topology regression checks for src/workspace3d/geo.ts.
 *
 * Loads the REAL geo.ts (a temporary copy in os.tmpdir() with only the
 * crypto-js import stubbed, deleted afterwards) and asserts that solids
 * which merely touch are NOT reported as overlapping, while genuine
 * overlaps and duplicates still are.
 *
 * Run: npm run verify:topology (exit code 1 if any case fails)
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'sih-topo-'));
const copyPath = join(dir, 'geo-under-test.ts');
try {
  const src = readFileSync(new URL('../src/workspace3d/geo.ts', import.meta.url), 'utf8');
  if (!src.includes("import { SHA256 } from 'crypto-js';")) {
    throw new Error('geo.ts import shape changed; update this script');
  }
  writeFileSync(
    copyPath,
    src.replace(
      "import { SHA256 } from 'crypto-js';",
      'const SHA256 = (s: string): { toString: () => string } => ({ toString: () => "stub" });',
    ),
  );
  const geo = await import(pathToFileURL(copyPath).href);
  const { generatePolyhedralSolid, validateTopology, checkOverlap } = geo;

  type Pt = [number, number];
  const square = (x0: number, y0: number, s: number): Pt[] => [
    [x0, y0],
    [x0 + s, y0],
    [x0 + s, y0 + s],
    [x0, y0 + s],
    [x0, y0],
  ];
  const solid = (pts: Pt[], zMin: number, zMax: number) =>
    generatePolyhedralSolid({ coordinates: pts }, zMin, zMax);

  let failed = 0;
  const check = (name: string, actual: boolean, expected: boolean, extra = '') => {
    const ok = actual === expected;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (got ${actual}, want ${expected})${extra}`);
  };

  const A = square(0, 0, 10);
  // a. shared full edge, same floor
  check('a shared edge', checkOverlap(solid(A, 0, 3), solid(square(10, 0, 10), 0, 3)).overlaps, false);
  // b. corner touch only
  check('b corner touch', checkOverlap(solid(A, 0, 3), solid(square(10, 10, 10), 0, 3)).overlaps, false);
  // c. 1 m overlap along x
  check('c 1m overlap', checkOverlap(solid(A, 0, 3), solid(square(9, 0, 10), 0, 3)).overlaps, true);
  // d. below / above eps
  check('d 0.0005m overlap', checkOverlap(solid(A, 0, 3), solid(square(10 - 0.0005, 0, 10), 0, 3)).overlaps, false);
  check('d 0.005m overlap', checkOverlap(solid(A, 0, 3), solid(square(10 - 0.005, 0, 10), 0, 3)).overlaps, true);
  // e. containment
  check('e containment', checkOverlap(solid(A, 0, 3), solid(square(3, 3, 4), 0, 3)).overlaps, true);
  // f. duplicate claim
  check('f duplicate', checkOverlap(solid(A, 0, 3), solid(A, 0, 3)).overlaps, true);
  // g. same footprint, stacked floors: skipped by validateTopology and clear of checkOverlap
  check(
    'g stacked floors via validateTopology',
    validateTopology([
      { id: 'G1', floor_id: 'F1', solid: solid(A, 0, 3) },
      { id: 'G2', floor_id: 'F2', solid: solid(A, 3, 6) },
    ]).issues.filter((i: { code: string }) => i.code === 'OVERLAP_DETECTED').length === 0,
    true,
  );
  check('g stacked floors via checkOverlap', checkOverlap(solid(A, 0, 3), solid(A, 3, 6)).overlaps, false);
  // h. one touching pair + one true pair -> exactly one issue, for the true pair
  const res = validateTopology([
    { id: 'H1', floor_id: 'F1', solid: solid(A, 0, 3) },
    { id: 'H2', floor_id: 'F1', solid: solid(square(10, 0, 10), 0, 3) },
    { id: 'H3', floor_id: 'F1', solid: solid(square(-9, 0, 10), 0, 3) },
  ]);
  const hits = res.issues.filter((i: { code: string }) => i.code === 'OVERLAP_DETECTED');
  check(
    'h exactly one issue for true pair',
    hits.length === 1 && hits[0].entity_id === 'H1,H3',
    true,
    ` (got ${hits.length}: ${hits.map((i: { entity_id: string }) => i.entity_id).join('; ')})`,
  );

  if (failed > 0) {
    console.log(`${failed} case(s) FAILED`);
    process.exitCode = 1;
  } else {
    console.log('all cases PASS');
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
