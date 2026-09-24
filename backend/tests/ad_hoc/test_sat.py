"""
Test SAT overlap detection algorithm
"""
import sys
sys.path.insert(0, 'backend')

from app import check_sat_overlap, generate_polyhedral_solid

def test_non_overlapping_boxes():
    """Two boxes that don't overlap"""
    # Box 1: 0-10 in all dimensions
    solid1 = generate_polyhedral_solid(
        [[0, 0], [10, 0], [10, 10], [0, 10]],
        0, 10
    )
    
    # Box 2: 20-30 in all dimensions (no overlap)
    solid2 = generate_polyhedral_solid(
        [[20, 20], [30, 20], [30, 30], [20, 30]],
        20, 30
    )
    
    result = check_sat_overlap(solid1, solid2)
    assert result["overlaps"] == False, f"Expected no overlap, got {result}"
    print("✓ Test 1 passed: Non-overlapping boxes correctly detected")

def test_overlapping_boxes():
    """Two boxes that overlap"""
    # Box 1: 0-10 in all dimensions
    solid1 = generate_polyhedral_solid(
        [[0, 0], [10, 0], [10, 10], [0, 10]],
        0, 10
    )
    
    # Box 2: 5-15 in all dimensions (overlaps by 5x5x5 = 125)
    solid2 = generate_polyhedral_solid(
        [[5, 5], [15, 5], [15, 15], [5, 15]],
        5, 15
    )
    
    result = check_sat_overlap(solid1, solid2)
    assert result["overlaps"] == True, f"Expected overlap, got {result}"
    assert "volume" in result, f"Expected volume in result, got {result}"
    # Volume should be approximately 125 (5x5x5)
    assert abs(result["volume"] - 125.0) < 10.0, f"Expected volume ~125, got {result['volume']}"
    print(f"✓ Test 2 passed: Overlapping boxes detected with volume {result['volume']:.2f}")

def test_touching_boxes():
    """Two boxes that touch but don't overlap"""
    # Box 1: 0-10 in all dimensions
    solid1 = generate_polyhedral_solid(
        [[0, 0], [10, 0], [10, 10], [0, 10]],
        0, 10
    )
    
    # Box 2: 10-20 in all dimensions (touches at x=10)
    solid2 = generate_polyhedral_solid(
        [[10, 0], [20, 0], [20, 10], [10, 10]],
        0, 10
    )
    
    result = check_sat_overlap(solid1, solid2)
    # Touching should not be detected as overlap (within epsilon tolerance)
    assert result["overlaps"] == False, f"Expected no overlap for touching boxes, got {result}"
    print("✓ Test 3 passed: Touching boxes correctly not detected as overlapping")

def test_different_floors():
    """Two boxes on different floors (same X/Y but different Z)"""
    # Box 1: Floor 1 (z=0-10)
    solid1 = generate_polyhedral_solid(
        [[0, 0], [10, 0], [10, 10], [0, 10]],
        0, 10
    )
    
    # Box 2: Floor 2 (z=20-30) - same X/Y but different Z
    solid2 = generate_polyhedral_solid(
        [[0, 0], [10, 0], [10, 10], [0, 10]],
        20, 30
    )
    
    result = check_sat_overlap(solid1, solid2)
    assert result["overlaps"] == False, f"Expected no overlap for different floors, got {result}"
    print("✓ Test 4 passed: Different floors correctly not detected as overlapping")

def test_rotated_solids_overlap():
    """Two solids of the same footprint, one rotated 45 degrees, sharing
    the same center -- must be detected as overlapping. This is the exact
    case the original check_sat_overlap stub (a hardcoded
    `return {"overlaps": False}`) silently failed on, and it was never
    covered by this test file until now.
    """
    import numpy as np

    def rotate_footprint(points, angle_deg, cx, cy):
        a = np.radians(angle_deg)
        out = []
        for x, y in points:
            x0, y0 = x - cx, y - cy
            xr = x0 * np.cos(a) - y0 * np.sin(a) + cx
            yr = x0 * np.sin(a) + y0 * np.cos(a) + cy
            out.append([xr, yr])
        return out

    solid1 = generate_polyhedral_solid([[0, 0], [10, 0], [10, 10], [0, 10]], 0, 10)
    rotated_footprint = rotate_footprint([[0, 0], [10, 0], [10, 10], [0, 10]], 45, 5, 5)
    solid2 = generate_polyhedral_solid(rotated_footprint, 0, 10)

    result = check_sat_overlap(solid1, solid2)
    assert result["overlaps"] == True, f"Expected overlap for concentric rotated solids, got {result}"
    print("✓ Test 5 passed: Rotated, concentric solids correctly detected as overlapping")


def test_rotated_solids_no_overlap():
    """Same rotated footprint as above, but moved far away -- must NOT overlap."""
    import numpy as np

    def rotate_footprint(points, angle_deg, cx, cy):
        a = np.radians(angle_deg)
        out = []
        for x, y in points:
            x0, y0 = x - cx, y - cy
            xr = x0 * np.cos(a) - y0 * np.sin(a) + cx
            yr = x0 * np.sin(a) + y0 * np.cos(a) + cy
            out.append([xr, yr])
        return out

    solid1 = generate_polyhedral_solid([[0, 0], [10, 0], [10, 10], [0, 10]], 0, 10)
    rotated_footprint = rotate_footprint([[0, 0], [10, 0], [10, 10], [0, 10]], 45, 40, 40)
    solid2 = generate_polyhedral_solid(rotated_footprint, 0, 10)

    result = check_sat_overlap(solid1, solid2)
    assert result["overlaps"] == False, f"Expected no overlap for distant rotated solids, got {result}"
    print("✓ Test 6 passed: Rotated, distant solids correctly not detected as overlapping")


def test_adjacent_units_shared_wall():
    """Two units side-by-side sharing an exact common wall (the single most
    common real floor-plan configuration in an actual apartment building)
    -- must NOT be flagged as an overlap. This was broken by an epsilon
    sign error in axes_overlap() that classified exactly-touching
    projections as overlapping; fixed here.
    """
    solid_left = generate_polyhedral_solid([[0, 0], [5, 0], [5, 5], [0, 5]], 0, 3)
    solid_right = generate_polyhedral_solid([[5, 0], [10, 0], [10, 5], [5, 5]], 0, 3)

    result = check_sat_overlap(solid_left, solid_right)
    assert result["overlaps"] == False, f"Expected no overlap for units sharing a wall, got {result}"
    print("✓ Test 7 passed: Adjacent units sharing a common wall correctly not flagged as overlapping")


def test_genuine_small_overlap_still_detected():
    """A real, small (0.01m) overlap must still be caught -- guards against
    an overcorrection of the touching-boundary fix that could mask small
    but genuine violations.
    """
    solid_left = generate_polyhedral_solid([[0, 0], [5, 0], [5, 5], [0, 5]], 0, 3)
    solid_right = generate_polyhedral_solid([[4.99, 0], [9.99, 0], [9.99, 5], [4.99, 5]], 0, 3)

    result = check_sat_overlap(solid_left, solid_right)
    assert result["overlaps"] == True, f"Expected a genuine small overlap to be detected, got {result}"
    expected_volume = 0.01 * 5 * 3
    assert abs(result["volume"] - expected_volume) < 0.01, f"Expected volume ~{expected_volume}, got {result['volume']}"
    print("✓ Test 8 passed: Genuine small (0.01m) overlap still correctly detected")


if __name__ == "__main__":
    print("Running SAT overlap detection tests...\n")
    
    try:
        test_non_overlapping_boxes()
        test_overlapping_boxes()
        test_touching_boxes()
        test_different_floors()
        test_rotated_solids_overlap()
        test_rotated_solids_no_overlap()
        test_adjacent_units_shared_wall()
        test_genuine_small_overlap_still_detected()
        
        print("\n✅ All SAT tests passed!")
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
