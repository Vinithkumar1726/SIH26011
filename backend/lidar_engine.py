"""CPU-oriented LIDAR vertical extraction engine.

Loads a point cloud with Open3D, aggressively downsamples it so low-end
CPU-only laptops stay responsive, filters statistical outliers, and
reports robust elevation bounds (2nd/98th Z percentiles, immune to
antennas, pits and other extreme points).
"""
import numpy as np
import open3d as o3d


def extract_points_array(points_xyz, voxel_size=0.5):
    """Core extraction over an (N, 3) array. Pure function, no I/O."""
    points_xyz = np.asarray(points_xyz, dtype=np.float64)
    if points_xyz.ndim != 2 or points_xyz.shape[1] != 3:
        raise ValueError("points_xyz must be an (N, 3) array")
    if points_xyz.shape[0] == 0:
        raise ValueError("empty point cloud")
    if voxel_size <= 0:
        raise ValueError("voxel_size must be positive")

    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points_xyz)
    down = pcd.voxel_down_sample(voxel_size)
    if len(down.points) == 0:
        raise ValueError("downsampling removed all points")
    _, inliers = down.remove_statistical_outlier(nb_neighbors=20, std_ratio=2.0)
    clean = down.select_by_index(inliers)
    if len(clean.points) == 0:
        raise ValueError("outlier filtering removed all points")
    z = np.asarray(clean.points)[:, 2]
    return {
        "z_min": float(np.percentile(z, 2)),
        "z_max": float(np.percentile(z, 98)),
        "point_count_raw": int(points_xyz.shape[0]),
        "point_count_clean": int(len(clean.points)),
    }


def extract_building_elevation(file_path, voxel_size=0.5):
    """Load a point-cloud file and return robust elevation bounds."""
    pcd = o3d.io.read_point_cloud(str(file_path))
    if len(pcd.points) == 0:
        raise ValueError(f"no points loaded from {file_path}")
    out = extract_points_array(np.asarray(pcd.points), voxel_size=voxel_size)
    out["file"] = str(file_path)
    out["voxel_size"] = float(voxel_size)
    return out
