# backend/tools — one-off diagnostics, never imported by live code.

## compare_tiles.py
Esri-vs-Google satellite tile sharpness comparison (Laplacian variance).

IMPORTANT: the Google endpoint (`mt1.google.com/vt/lyrs=s`) is unofficial
and ToS-grey-area. This tool is for one-off visual/sharpness comparisons
only — never wire it into the live pipeline. `vision_engine.py` uses Esri
World Imagery exclusively.

Output defaults to `./tile_compare_out/` (repo root), which is gitignored —
comparison PNGs must never be committed.
