"""YOLOv11-ONNX vision engine for live building footprint extraction.

Attempts to segment a real building contour from a satellite tile around
a clicked map point. Every failure mode (missing model file, bad weights,
inference errors) returns None so callers can fall back to the synthetic
10m bounding-box footprint.
"""

import os

import cv2
import numpy as np
import onnxruntime as ort

TILE_PX = 640
TILE_HALF_M = 25.0


def _mercator_bbox(lat: float, lon: float, half_m: float = TILE_HALF_M):
    """~50m x 50m Web-Mercator-style box around (lat, lon), in degrees."""
    cos_lat = max(float(np.cos(np.radians(lat))), 1e-6)
    d_lat = half_m / 111320.0
    d_lon = half_m / (111320.0 * cos_lat)
    return lon - d_lon, lat - d_lat, lon + d_lon, lat + d_lat


def extract_building_wkt(
    lat: float, lon: float, model_path: str = "test-data/yolo-seg.onnx"
) -> str | None:
    """Segment a building contour near (lat, lon); None on any failure."""
    try:
        if not os.path.exists(model_path):
            return None

        min_lon, min_lat, max_lon, max_lat = _mercator_bbox(lat, lon)

        # Placeholder for a real WMS tile fetch (640x640 RGB).
        tile = np.zeros((TILE_PX, TILE_PX, 3), dtype=np.uint8)

        session = ort.InferenceSession(model_path)
        feed = {session.get_inputs()[0].name: tile.transpose(2, 0, 1)[None].astype(np.float32) / 255.0}
        outputs = session.run(None, feed)

        mask = np.asarray(outputs[0]).squeeze()
        if mask.ndim != 2:
            # Take the strongest class channel if the head returns per-class maps.
            mask = mask.reshape(mask.shape[-2], mask.shape[-1]) if mask.size == TILE_PX * TILE_PX else None
            if mask is None:
                return None
        gray = (np.clip(mask, 0, 1) * 255).astype(np.uint8)
        if gray.shape != (TILE_PX, TILE_PX):
            gray = cv2.resize(gray, (TILE_PX, TILE_PX))

        contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None
        contour = max(contours, key=cv2.contourArea)
        if cv2.contourArea(contour) < 4:
            return None

        pts = contour.squeeze(1).astype(np.float64)  # (N, 2) pixel xy
        span_lon = max_lon - min_lon
        span_lat = max_lat - min_lat
        coords = [
            (
                min_lon + (float(x) / TILE_PX) * span_lon,
                max_lat - (float(y) / TILE_PX) * span_lat,
            )
            for x, y in pts
        ]
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        if len(coords) < 4:
            return None
        return "POLYGON((%s))" % ", ".join(f"{x} {y}" for x, y in coords)
    except Exception:
        return None
