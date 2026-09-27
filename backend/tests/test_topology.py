"""Topology regression tests against native PostGIS 3D operators.

Read-only: synthetic solids are built inside SQL CTEs (no table writes)
and the live-data check is a SELECT. Requires the database running.

Synthetic footprints are lon/lat rings near 11.009N, 76.960E so the
1 mm penetration rule is asserted in real metres. The pair predicate
mirrors OVERLAP_PAIRS_SQL in app.py: axis-aligned boxes need >1 mm of
overlap on every axis; anything else counts on full-dimension intersection.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text

from backend.services.geometry_service import OVERLAP_PAIRS_SQL

ENG = create_engine('postgresql://postgres:postgres@localhost:5432/sih26011')

BASE_LON = 76.960
BASE_LAT = 11.009
M_LAT = 111320.0
KX = M_LAT * math.cos(math.radians(BASE_LAT))


def ring(dx_m, dy_m, s_m):
    """Closed lon/lat ring for an s_m square at metre offset (dx_m, dy_m)."""
    x0 = BASE_LON + dx_m / KX
    y0 = BASE_LAT + dy_m / M_LAT
    ex = s_m / KX
    ey = s_m / M_LAT
    return [(x0, y0), (x0 + ex, y0), (x0 + ex, y0 + ey), (x0, y0 + ey), (x0, y0)]


def tri(dx_m, dy_m, s_m):
    """Closed lon/lat ring for a right triangle (a non-box solid)."""
    x0 = BASE_LON + dx_m / KX
    y0 = BASE_LAT + dy_m / M_LAT
    ex = s_m / KX
    ey = s_m / M_LAT
    return [(x0, y0), (x0 + ex, y0), (x0, y0 + ey), (x0, y0)]


def wkt(pts):
    return 'POLYGON((%s))' % ', '.join(f'{x:.12f} {y:.12f}' for x, y in pts)


def solid_expr(wkt_param, dz_param, z_param):
    return ('ST_Translate(ST_Extrude(ST_Force3D(ST_GeomFromText(%s, 4326)), 0, 0, %s), 0, 0, %s)'
            % (wkt_param, dz_param, z_param))


M_CTE = """
m AS (
    SELECT id, floor_id, solid,
           ST_XMin(solid) AS xmin, ST_XMax(solid) AS xmax,
           ST_YMin(solid) AS ymin, ST_YMax(solid) AS ymax,
           ST_ZMin(solid) AS zmin, ST_ZMax(solid) AS zmax,
           ST_Volume(solid) AS vol
    FROM s
)
"""

PRED = """
SELECT a.id, b.id FROM m a JOIN m b ON a.floor_id = b.floor_id AND a.id < b.id
WHERE ST_3DIntersects(a.solid, b.solid)
  AND (
    ((ABS(a.vol - (a.xmax - a.xmin) * (a.ymax - a.ymin) * (a.zmax - a.zmin))
          <= 1e-9 * (a.xmax - a.xmin) * (a.ymax - a.ymin) * (a.zmax - a.zmin)
      AND ABS(b.vol - (b.xmax - b.xmin) * (b.ymax - b.ymin) * (b.zmax - b.zmin))
          <= 1e-9 * (b.xmax - b.xmin) * (b.ymax - b.ymin) * (b.zmax - b.zmin))
     AND LEAST(a.xmax, b.xmax) - GREATEST(a.xmin, b.xmin) > 0.001 / (111320 * COS(RADIANS(:lat0)))
     AND LEAST(a.ymax, b.ymax) - GREATEST(a.ymin, b.ymin) > 0.001 / 111320
     AND LEAST(a.zmax, b.zmax) - GREATEST(a.zmin, b.zmin) > 0.001)
    OR (NOT (
      ABS(a.vol - (a.xmax - a.xmin) * (a.ymax - a.ymin) * (a.zmax - a.zmin))
          <= 1e-9 * (a.xmax - a.xmin) * (a.ymax - a.ymin) * (a.zmax - a.zmin)
      AND ABS(b.vol - (b.xmax - b.xmin) * (b.ymax - b.ymin) * (b.zmax - b.zmin))
          <= 1e-9 * (b.xmax - b.xmin) * (b.ymax - b.ymin) * (b.zmax - b.zmin))
     AND ST_Dimension(ST_3DIntersection(a.solid, b.solid)) = 3)
  )
"""


def check_rows(rows):
    """Run the shared predicate over synthetic (id, floor, wkt, zmin, dz) rows."""
    values = ', '.join(
        "('%s', 'F1', %s)" % (r[0], solid_expr(':w%d' % i, ':dz%d' % i, ':z%d' % i))
        for i, r in enumerate(rows)
    )
    params = {'lat0': BASE_LAT}
    for i, r in enumerate(rows):
        # rows are (id, wkt, zmin, dz)
        params.update({'w%d' % i: r[1], 'dz%d' % i: r[3], 'z%d' % i: r[2]})
    with ENG.connect() as c:
        return c.execute(text(
            'WITH s(id, floor_id, solid) AS (VALUES %s), %s %s'
            % (values, M_CTE, PRED)
        ), params).all()


def ids(rows):
    return sorted((r[0], r[1]) for r in rows)


def sq(dx, dy, s=10.0):
    return wkt(ring(dx, dy, s))


def test_shared_edge_no_overlap():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', sq(10, 0), 0, 3)])) == []


def test_corner_touch_no_overlap():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', sq(10, 10), 0, 3)])) == []


def test_face_touch_stacked_no_overlap():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', sq(0, 0), 3, 3)])) == []


def test_1m_overlap_flagged():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', sq(9, 0), 0, 3)])) == [('A', 'B')]


def test_below_eps_no_overlap():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', sq(10 - 0.0005, 0), 0, 3)])) == []


def test_above_eps_flagged():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', sq(10 - 0.005, 0), 0, 3)])) == [('A', 'B')]


def test_containment_flagged():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', sq(3, 3, 4), 0, 3)])) == [('A', 'B')]


def test_duplicate_flagged():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', sq(0, 0), 0, 3)])) == [('A', 'B')]


def test_nonbox_touch_no_overlap():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', wkt(tri(10, 0, 10)), 0, 3)])) == []


def test_nonbox_overlap_flagged():
    assert ids(check_rows([('A', sq(0, 0), 0, 3), ('B', wkt(tri(5, 5, 10)), 0, 3)])) == [('A', 'B')]


def test_stacked_floors_not_compared():
    with ENG.connect() as c:
        rows = c.execute(text(
            'WITH s(id, floor_id, solid) AS (VALUES '
            "('G1', 'F1', %s), ('G2', 'F2', %s)), %s %s"
            % (solid_expr(':wa', ':dza', ':za'), solid_expr(':wb', ':dzb', ':zb'), M_CTE, PRED)
        ), {'wa': sq(0, 0), 'dza': 3, 'za': 0,
            'wb': sq(0, 0), 'dzb': 3, 'zb': 3, 'lat0': BASE_LAT}).all()
    assert rows == []


def test_mixed_set_yields_only_true_pair():
    assert ids(check_rows([
        ('H1', sq(0, 0), 0, 3),
        ('H2', sq(10, 0), 0, 3),
        ('H3', sq(-9, 0), 0, 3),
    ])) == [('H1', 'H3')]


def test_live_data_has_no_overlaps():
    with ENG.connect() as c:
        rows = c.execute(text(OVERLAP_PAIRS_SQL), {'floor_id': None}).all()
    assert rows == []
    with ENG.connect() as c:
        nulls = c.execute(text('SELECT count(*) FROM property_unit WHERE solid_geom IS NULL')).scalar()
    assert nulls == 0
