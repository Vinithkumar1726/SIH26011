"""Ingest public/coimbatore/buildings_catalog.json into PostGIS.

For each OSM catalog record: convert the GLB-local [x, z] footprint
(x east, z = -north, metres from the tile origin in meta.json) to lon/lat,
link the building to the containing parcel (or a single synthetic tile
parcel following the existing '00000000000000' convention), insert the
building row, and populate solid_geom with ST_Extrude(ST_Force3D(...)).
Idempotent: existing ids are skipped. Usage: python backend/ingest_catalog.py
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'backend'))

from sqlalchemy import create_engine, text  # noqa: E402

M_LAT = 111320.0
TILE_PARCEL_ID = 'parcel-osm-coimbatore'
TILE_ULPIN = '00000000000000'


def glb_to_lonlat(x, z, mlon, mlat):
    return [
        mlon + x / (M_LAT * math.cos(math.radians(mlat))),
        mlat + (-z) / M_LAT,
    ]


def close_ring(pts):
    if len(pts) > 1 and pts[0] == pts[-1]:
        return pts
    return pts + [pts[0]]


def main():
    meta = json.loads((ROOT / 'public' / 'coimbatore' / 'meta.json').read_text())
    mlon, mlat = meta['origin']['lon'], meta['origin']['lat']
    catalog = json.loads((ROOT / 'public' / 'coimbatore' / 'buildings_catalog.json').read_text())
    print(f'catalog records: {len(catalog)}')

    eng = create_engine('postgresql://postgres:postgres@localhost:5432/sih26011')
    with eng.begin() as conn:
        parcels = conn.execute(text(
            'SELECT id, ST_AsGeoJSON(geometry) AS g FROM land_parcel')).fetchall()
        from shapely.geometry import shape as shp, Point
        pgeoms = [(pid, shp(json.loads(g))) for pid, g in parcels if g]

        def containing_parcel(lon, lat):
            pt = Point(lon, lat)
            for pid, geom in pgeoms:
                try:
                    if geom.contains(pt):
                        return pid
                except Exception:
                    continue
            return None

        orphans = []
        rows = []
        skipped_bad = 0
        for r in catalog:
            try:
                bid = str(r['id'])
                fp = r['footprint']
                if not isinstance(fp, list) or len(fp) < 3:
                    raise ValueError('bad footprint')
                for p in fp:
                    if (not isinstance(p, (list, tuple)) or len(p) < 2
                            or not isinstance(p[0], (int, float))
                            or not isinstance(p[1], (int, float))):
                        raise ValueError('bad point')
                lonlat = [glb_to_lonlat(x, z, mlon, mlat) for x, z in fp]
                lonlat = close_ring([[float(x), float(y)] for x, y in lonlat])
                if len({(round(x, 9), round(y, 9)) for x, y in lonlat}) < 3:
                    raise ValueError('degenerate ring')
                h = r.get('height')
                if not isinstance(h, (int, float)) or not math.isfinite(h) or h <= 0:
                    raise ValueError('bad height')
                hs = 'OSM' if r.get('heightSource') in ('osm_height', 'osm_levels') else 'ESTIMATED'
                lv = r.get('levels')
                fc = int(lv) if isinstance(lv, (int, float)) and lv > 0 else 1
                name = r.get('name') or f'OSM building {bid}'
                pid = containing_parcel(lonlat[0][0], lonlat[0][1])
                wkt = 'POLYGON((%s))' % ', '.join(f'{x:.9f} {y:.9f}' for x, y in lonlat)
                rows.append({'id': bid, 'parcel_id': pid, 'name': name,
                             'height_m': float(h), 'height_source': hs,
                             'floors_count': fc, 'wkt': wkt})
                if pid is None:
                    orphans.append(bid)
            except Exception as e:
                skipped_bad += 1
                print(f'  skip {r.get("id")}: {e}')

        if orphans:
            print(f'orphans needing tile parcel: {len(orphans)}')
            exists = conn.execute(
                text('SELECT id FROM land_parcel WHERE id = :i'), {'i': TILE_PARCEL_ID}).scalar()
            if not exists:
                conn.execute(text(
                    "INSERT INTO land_parcel (id, ulpin, name, area_sqm, srid, geometry) "
                    "VALUES (:i, :u, :n, :a, 4326, ST_GeomFromText(:w, 4326))"),
                    {'i': TILE_PARCEL_ID, 'u': TILE_ULPIN,
                     'n': 'Coimbatore OSM tile (synthetic)',
                     'a': float(meta.get('extent', 1400)) ** 2,
                     'w': 'MULTIPOLYGON(((%s)))' % ', '.join(
                         f'{x:.6f} {y:.6f}' for x, y in [
                             (mlon - 0.02, mlat - 0.02), (mlon + 0.02, mlat - 0.02),
                             (mlon + 0.02, mlat + 0.02), (mlon - 0.02, mlat + 0.02),
                             (mlon - 0.02, mlat - 0.02)])})
                print('  created tile parcel parcel-osm-coimbatore')
            for row in rows:
                if row['parcel_id'] is None:
                    row['parcel_id'] = TILE_PARCEL_ID

        inserted = 0
        skipped_have = 0
        failed = 0
        for row in rows:
            have = conn.execute(
                text('SELECT id FROM building WHERE id = :i'), {'i': row['id']}).scalar()
            if have:
                skipped_have += 1
                continue
            try:
                with conn.begin_nested():
                    conn.execute(text(
                        'INSERT INTO building (id, parcel_id, name, height_m, height_source, '
                        'floors_count, footprint) VALUES (:id, :parcel_id, :name, :height_m, '
                        ":height_source, :floors_count, ST_GeomFromText(:wkt, 4326))"), row)
                    conn.execute(text(
                        'UPDATE building SET solid_geom = ST_Extrude(ST_Force3D(footprint), 0, 0, height_m) '
                        'WHERE id = :i'), {'i': row['id']})
                inserted += 1
            except Exception as e:
                failed += 1
                print(f'  failed {row["id"]}: {type(e).__name__}: {str(e)[:160]}')

        nulls = conn.execute(text(
            "SELECT count(*) FROM building WHERE id LIKE 'w%' AND solid_geom IS NULL")).scalar()
        total = conn.execute(text("SELECT count(*) FROM building WHERE id LIKE 'w%'")).scalar()
        print(f'inserted={inserted} already_present={skipped_have} failed={failed} '
              f'skipped_bad={skipped_bad}')
        print(f'imported buildings with NULL solid_geom: {nulls}/{total}')


if __name__ == '__main__':
    main()
