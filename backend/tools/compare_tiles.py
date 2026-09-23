"""Esri-vs-Google tile sharpness comparison (one-off diagnostic CLI).

NOTE: the Google endpoint used here (mt1.google.com/vt/lyrs=s) is
unofficial and ToS-grey-area. This tool exists for one-off visual/
sharpness comparisons only — NEVER wire it into the live pipeline
(vision_engine.py uses Esri World Imagery).

Usage:
    python backend/tools/compare_tiles.py --lat 11.0094 --lon 76.9610
    python backend/tools/compare_tiles.py --lat 11.00915 --lon 76.960225 --zooms 19 --out ./tile_compare_out
"""
import argparse
import io
import math
import os
import sys
import time
import urllib.request

import numpy as np
from PIL import Image

UA = "sih26011-tile-comparison/1.0"
TILE_PX = 256


def latlon_to_xy(lat, lon, z):
    n = 2 ** z
    x = math.floor((lon + 180.0) / 360.0 * n)
    lat_r = math.radians(lat)
    y = math.floor((1.0 - math.log(math.tan(lat_r) + 1.0 / math.cos(lat_r)) / math.pi) / 2.0 * n)
    return x, y


def get_tile(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = resp.read()
        status = resp.status
    time.sleep(0.3)
    img = Image.open(io.BytesIO(body)).convert("RGB")
    return status, len(body), img


def laplacian_variance(img):
    g = np.asarray(img.convert("L"), dtype=np.float64)
    lap = (
        g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:] - 4.0 * g[1:-1, 1:-1]
    )
    return float(lap.var())


def main():
    ap = argparse.ArgumentParser(description="Compare Esri vs Google tile sharpness.")
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--zooms", default="18,19,20")
    ap.add_argument("--out", default="./tile_compare_out")
    args = ap.parse_args()

    zooms = [int(z) for z in args.zooms.split(",") if z.strip()]
    mid = zooms[len(zooms) // 2]
    os.makedirs(args.out, exist_ok=True)
    providers = [
        ("esri", lambda x, y, z: f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"),
        ("google", lambda x, y, z: f"https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"),
    ]
    rows = []
    for z in zooms:
        x0, y0 = latlon_to_xy(args.lat, args.lon, z)
        for tag, url_fn in providers:
            try:
                status, nbytes, img = get_tile(url_fn(x0, y0, z))
                img.save(os.path.join(args.out, f"{tag}_z{z}_single.png"))
                lv = laplacian_variance(img)
                print(f"{tag} z{z} single: HTTP {status}, {nbytes} bytes, {img.size}, lapvar {lv:.1f}")
                rows.append((tag, z, "single", str(img.size), round(lv, 1)))
            except Exception as e:
                print(f"{tag} z{z} single: FAILED {str(e)[:120]}")
                rows.append((tag, z, "single", None, None))

    x0, y0 = latlon_to_xy(args.lat, args.lon, mid)
    for tag, url_fn in providers:
        try:
            grid = []
            for dy in (-1, 0, 1):
                row = []
                for dx in (-1, 0, 1):
                    status, nbytes, img = get_tile(url_fn(x0 + dx, y0 + dy, mid))
                    print(f"{tag} z{mid} tile dx={dx} dy={dy}: HTTP {status}, {nbytes} bytes")
                    row.append(img)
                grid.append(row)
            w, h = grid[0][0].size
            big = Image.new("RGB", (w * 3, h * 3))
            for j, row in enumerate(grid):
                for i, img in enumerate(row):
                    big.paste(img, (i * w, j * h))
            big.save(os.path.join(args.out, f"{tag}_z{mid}_stitched3x3.png"))
            lv = laplacian_variance(big)
            print(f"{tag} z{mid} stitched: {big.size}, lapvar {lv:.1f}")
            rows.append((tag, mid, "stitched3x3", str(big.size), round(lv, 1)))
        except Exception as e:
            print(f"{tag} z{mid} stitched: FAILED {str(e)[:120]}")
            rows.append((tag, mid, "stitched3x3", None, None))

    print()
    print(f"{'provider':<8}{'zoom':<6}{'kind':<12}{'dims':<14}{'laplacian_var'}")
    for tag, z, kind, dims, lv in rows:
        print(f"{tag:<8}{z:<6}{kind:<12}{str(dims):<14}{lv}")
    print("saved to", os.path.abspath(args.out))


if __name__ == "__main__":
    sys.exit(main())
