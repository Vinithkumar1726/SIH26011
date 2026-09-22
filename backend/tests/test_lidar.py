"""Fast synthetic tests for the LIDAR elevation engine (no hardware needed)."""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from lidar_engine import extract_building_elevation, extract_points_array


def make_cloud(seed=7):
    rng = np.random.default_rng(seed)
    base = rng.uniform(low=[0.0, 0.0, 10.0], high=[50.0, 50.0, 40.0], size=(4000, 3))
    spikes = np.array([[25.0, 25.0, 200.0], [10.0, 10.0, -50.0], [40.0, 40.0, 150.0]])
    return np.vstack([base, spikes])


def test_percentiles_ignore_outliers():
    out = extract_points_array(make_cloud(), voxel_size=0.5)
    assert 9.0 < out["z_min"] < 12.0, out
    assert 38.0 < out["z_max"] < 41.0, out
    assert out["point_count_clean"] < out["point_count_raw"]
    assert out["point_count_clean"] > 100


def test_file_path_entrypoint(tmp_path):
    import open3d as o3d

    pts = make_cloud(seed=11)
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(pts)
    f = tmp_path / "fake.ply"
    assert o3d.io.write_point_cloud(str(f), pcd)
    out = extract_building_elevation(str(f), voxel_size=0.5)
    assert 9.0 < out["z_min"] < 12.0, out
    assert 38.0 < out["z_max"] < 41.0, out
    assert out["file"] == str(f)


def test_empty_cloud_rejected():
    import pytest

    with pytest.raises(ValueError):
        extract_points_array(np.zeros((0, 3)))
