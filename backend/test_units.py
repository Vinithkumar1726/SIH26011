import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from app import generate_polyhedral_solid, hash_geometry
from shapely.geometry import shape
import geojson

# Test parsing the units file
test_data_dir = Path(__file__).parent.parent / 'test-data'
with open(test_data_dir / 'units.geojson', 'r') as f:
    data = geojson.load(f)

def test_generate_polyhedral_solid():
    for feature in data['features']:
        geom = feature['geometry']
        props = feature['properties']
        shapely_geom = shape(geom)
        coords = list(shapely_geom.exterior.coords)
        z_min = float(props.get('z_min_m', 0.0))
        z_max = float(props.get('z_max_m', 3.0))
        solid = generate_polyhedral_solid(coords[:-1], z_min, z_max)
        geom_hash = hash_geometry(solid)
        assert solid['volume'] > 0
        assert len(geom_hash) == 64  # SHA256 hex
        print(f"Unit {props['unit_code']}: hash={geom_hash[:16]}, volume={solid['volume']}")