"""Topology regression tests: touching solids must not flag as overlapping.

Pure functions only (no database). Footprints are lon/lat rings near
11.009N, 76.960E, converted to local metres by build_overlap_solids,
exactly like the validation run and the PUT geometry gate.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app import TOUCH_EPS_M, build_overlap_solids, validate_topology

BASE_LON = 76.960
BASE_LAT = 11.009
M_LAT = 111320.0


def ring(dx_m, dy_m, s_m):
    """Closed lon/lat ring for an s_m square at metre offset (dx_m, dy_m)."""
    kx = M_LAT * math.cos(math.radians(BASE_LAT))
    x0 = BASE_LON + dx_m / kx
    y0 = BASE_LAT + dy_m / M_LAT
    ex = s_m / kx
    ey = s_m / M_LAT
    return [[x0, y0], [x0 + ex, y0], [x0 + ex, y0 + ey], [x0, y0 + ey], [x0, y0]]


def entry(uid, ring, z0=0.0, z1=3.0, floor='F1'):
    return {'id': uid, 'floor_id': floor, 'ring': ring, 'z_min': z0, 'z_max': z1}


def overlap_ids(entries):
    solids = build_overlap_solids(entries)
    return sorted(
        i['entity_id'] for i in validate_topology(solids)['issues']
        if i['code'] == 'OVERLAP_DETECTED'
    )


def test_eps_is_1mm():
    assert TOUCH_EPS_M == 0.001


def test_shared_edge_no_overlap():
    assert overlap_ids([entry('A', ring(0, 0, 10)), entry('B', ring(10, 0, 10))]) == []


def test_corner_touch_no_overlap():
    assert overlap_ids([entry('A', ring(0, 0, 10)), entry('B', ring(10, 10, 10))]) == []


def test_1m_overlap_flagged():
    assert overlap_ids([entry('A', ring(0, 0, 10)), entry('B', ring(9, 0, 10))]) == ['A,B']


def test_below_eps_no_overlap():
    assert overlap_ids([entry('A', ring(0, 0, 10)), entry('B', ring(10 - 0.0005, 0, 10))]) == []


def test_above_eps_flagged():
    assert overlap_ids([entry('A', ring(0, 0, 10)), entry('B', ring(10 - 0.005, 0, 10))]) == ['A,B']


def test_containment_flagged():
    assert overlap_ids([entry('A', ring(0, 0, 10)), entry('B', ring(3, 3, 4))]) == ['A,B']


def test_duplicate_flagged():
    assert overlap_ids([entry('A', ring(0, 0, 10)), entry('B', ring(0, 0, 10))]) == ['A,B']


def test_stacked_floors_not_compared():
    solids = build_overlap_solids([
        entry('G1', ring(0, 0, 10), z0=0.0, z1=3.0, floor='F1'),
        entry('G2', ring(0, 0, 10), z0=3.0, z1=6.0, floor='F2'),
    ])
    issues = [i for i in validate_topology(solids)['issues'] if i['code'] == 'OVERLAP_DETECTED']
    assert issues == []


def test_mixed_set_yields_only_true_pair():
    assert overlap_ids([
        entry('H1', ring(0, 0, 10)),
        entry('H2', ring(10, 0, 10)),
        entry('H3', ring(-9, 0, 10)),
    ]) == ['H1,H3']
