import re

# Read the file
with open(r'C:\Users\Vivekkumar\Desktop\vinith\SIH26011\SIH26011-enhanced-full-pass\backend\app.py', 'r') as f:
    content = f.read()

# Find and replace the specific section
old_code = '''                    for feature in data.get("features", []):
                        props = feature.get("properties", {})
                        geom = feature.get("geometry")
                        
                        from geoalchemy2.shape import from_shape
                        from shapely.geometry import shape
                        
                        shapely_geom = shape(geom)
                        footprint_wkb = from_shape(shapely_geom, srid=4326)
                        
                        # Get floor reference
                        floor_ref = props.get("floor_id", "floor-0")
                        
                        # Generate 3D solid
                        coords = list(shapely_geom.exterior.coords)
                        z_min = float(props.get("z_min_m", 0.0))
                        z_max = float(props.get("z_max_m", 3.0))
                        
                        solid = generate_polyhedral_solid(coords[:-1], z_min, z_max)  # Exclude closing vertex
                        geom_hash = hash_geometry(solid)
                        # Skip solid_geom storage for now - can be generated on the fly from footprint + z_min/z_max
                        solid_wkb = None
                        print(f"DEBUG: Created unit with footprint, hash={geom_hash[:16]}")
                        
                        unit_record = PropertyUnit('''

new_code = '''                    for feature in data.get("features", []):
                        props = feature.get("properties", {})
                        geom = feature.get("geometry")
                        
                        from geoalchemy2.shape import from_shape
                        from shapely.geometry import shape
                        
                        shapely_geom = shape(geom)
                        
                        # Validate footprint geometry (self-intersection check)
                        geom_error = validate_footprint_geometry(shapely_geom)
                        if geom_error:
                            raise HTTPException(
                                status_code=422,
                                detail=f"Invalid footprint geometry: {geom_error}"
                            )
                        
                        # Validate required properties
                        prop_error = validate_unit_properties(props)
                        if prop_error:
                            raise HTTPException(
                                status_code=422,
                                detail=prop_error
                            )
                        
                        footprint_wkb = from_shape(shapely_geom, srid=4326)
                        
                        # Get floor reference
                        floor_ref = props.get("floor_id", "floor-0")
                        
                        # Generate 3D solid
                        coords = list(shapely_geom.exterior.coords)
                        z_min = float(props.get("z_min_m", 0.0))
                        z_max = float(props.get("z_max_m", 3.0))
                        
                        solid = generate_polyhedral_solid(coords[:-1], z_min, z_max)  # Exclude closing vertex
                        geom_hash = hash_geometry(solid)
                        # Skip solid_geom storage for now - can be generated on the fly from footprint + z_min/z_max
                        solid_wkb = None
                        print(f"DEBUG: Created unit with footprint, hash={geom_hash[:16]}")
                        
                        unit_record = PropertyUnit('''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(r'C:\Users\Vivekkumar\Desktop\vinith\SIH26011\SIH26011-enhanced-full-pass\backend\app.py', 'w') as f:
        f.write(content)
    print("Patch applied successfully!")
else:
    print("Old code not found!")