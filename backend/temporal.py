"""MLOps ledger stub: footprint-change evaluation between captures.

Future home of the YOLOv11 intersection logic (ST_HausdorffDistance /
ST_Difference). For now returns basic shapely overlap metrics with an
explicit stub marker so nothing downstream mistakes them for model output.
"""
from shapely.wkt import loads as _loads


def evaluate_footprint_diff(new_geom_wkt: str, existing_geom_wkt: str) -> dict:
    """Compare two footprint WKTs. Returns dummy comparison metrics."""
    try:
        new = _loads(new_geom_wkt)
        old = _loads(existing_geom_wkt)
        inter = new.intersection(old).area
        union = new.union(old).area
        iou = (inter / union) if union else 0.0
        return {
            "iou": round(iou, 4),
            "added_area_deg2": round(max(new.area - inter, 0.0), 8),
            "removed_area_deg2": round(max(old.area - inter, 0.0), 8),
            "hausdorff_m": 0.0,
            "verdict": "stub",
            "model": "YOLO11n-seg ONNX (pending ST_HausdorffDistance/ST_Difference integration)",
        }
    except Exception as e:
        return {
            "iou": 0.0,
            "added_area_deg2": 0.0,
            "removed_area_deg2": 0.0,
            "hausdorff_m": 0.0,
            "verdict": "stub-error",
            "model": "YOLO11n-seg ONNX (pending ST_HausdorffDistance/ST_Difference integration)",
            "error": str(e)[:160],
        }
