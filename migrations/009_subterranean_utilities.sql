-- 009: subterranean utility network (3D linestrings, depths below MSL datum).
-- Non-destructive: brand-new table. Mock runs under the Coimbatore tile
-- with negative Z (metres below ground surface datum).
CREATE TABLE IF NOT EXISTS subterranean_utilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utility_type VARCHAR(16) NOT NULL
        CHECK (utility_type IN ('water', 'sewer', 'fiber', 'power')),
    depth_m FLOAT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'planned', 'decommissioned')),
    geom Geometry(LINESTRINGZ, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_utilities_3d
    ON subterranean_utilities USING gist (geom gist_geometry_ops_nd);

INSERT INTO subterranean_utilities (utility_type, depth_m, status, geom) VALUES
('water', -2.0, 'active',
 ST_GeomFromText('LINESTRINGZ(76.9555 11.0090 -2.0,76.9580 11.0095 -2.0,76.9605 11.0105 -2.0)', 4326)),
('sewer', -5.0, 'active',
 ST_GeomFromText('LINESTRINGZ(76.9560 11.0085 -5.0,76.9590 11.0100 -5.0,76.9615 11.0115 -5.0)', 4326)),
('fiber', -1.5, 'active',
 ST_GeomFromText('LINESTRINGZ(76.9570 11.0110 -1.5,76.9595 11.0100 -1.5,76.9620 11.0090 -1.5)', 4326)),
('power', -3.0, 'planned',
 ST_GeomFromText('LINESTRINGZ(76.9550 11.0105 -3.0,76.9585 11.0115 -3.0,76.9610 11.0125 -3.0)', 4326));
