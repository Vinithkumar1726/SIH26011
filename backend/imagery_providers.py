"""Satellite/aerial imagery provider abstraction for live-map capture.

Architecture:
    Map UI -> FastAPI -> ImageryProvider -> tiles -> AOI mosaic -> YOLO

Only providers with legitimate access patterns are implemented:
  - Esri World Imagery (open XYZ endpoint, no key): DEFAULT provider.
  - Google Maps tiles via official API key (env GOOGLE_MAPS_API_KEY):
    never scraped; falls back to Esri when no key is configured.
"""
import os
import urllib.request
from abc import ABC, abstractmethod

import cv2
import numpy as np

_BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'


class ImageryProvider(ABC):
    """Imagery source behind the live-capture tile pipeline."""

    name = "base"

    def get_metadata(self, aoi: dict) -> dict:
        return {"provider": self.name, "aoi": aoi}

    @abstractmethod
    def tile_url(self, x: int, y: int, zoom: int) -> str:
        ...

    def request(self, url: str) -> urllib.request.Request:
        return urllib.request.Request(url, headers={'User-Agent': _BROWSER_UA})

    def fetch_tile(self, x: int, y: int, zoom: int, timeout: int = 5) -> np.ndarray | None:
        """Download one tile; None on any failure (caller falls back)."""
        try:
            with urllib.request.urlopen(self.request(self.tile_url(x, y, zoom)), timeout=timeout) as resp:
                arr = np.frombuffer(resp.read(), np.uint8)
                return cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception:
            return None


class EsriWorldImageryProvider(ImageryProvider):
    """Open Esri World Imagery XYZ tiles. Default provider, no key needed."""

    name = "esri-world-imagery"

    def tile_url(self, x: int, y: int, zoom: int) -> str:
        return f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{y}/{x}"


class GoogleOfficialProvider(ImageryProvider):
    """Google Map Tiles API v1 via official API key (env GOOGLE_MAPS_API_KEY).

    Flow: createSession (mapType=satellite) -> session token (cached until
    expiry) -> 2dtiles/{z}/{x}/{y}?session=&key=. Raises at construction
    when no key is configured so the pipeline can fall back.
    """

    name = "google-official"
    _session_token: str | None = None
    _session_expiry: float = 0.0

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GOOGLE_MAPS_API_KEY")
        if not self.api_key:
            raise RuntimeError("GOOGLE_MAPS_API_KEY is not configured")

    def _session(self) -> str:
        import json as _json
        import time as _time

        if (GoogleOfficialProvider._session_token
                and _time.time() < GoogleOfficialProvider._session_expiry - 60):
            return GoogleOfficialProvider._session_token
        body = _json.dumps({
            "mapType": "satellite",
            "language": "en-US",
            "region": "IN",
        }).encode()
        req = urllib.request.Request(
            f"https://tile.googleapis.com/v1/createSession?key={self.api_key}",
            data=body,
            headers={'Content-Type': 'application/json', 'User-Agent': _BROWSER_UA},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = _json.loads(resp.read().decode())
        token = data.get("session")
        if not token:
            raise RuntimeError(f"Map Tiles session creation failed: {str(data)[:160]}")
        self_token = token
        GoogleOfficialProvider._session_token = self_token
        try:
            GoogleOfficialProvider._session_expiry = float(data.get("expiry", 0)) or (_time.time() + 1700)
        except (TypeError, ValueError):
            GoogleOfficialProvider._session_expiry = _time.time() + 1700
        return self_token

    def tile_url(self, x: int, y: int, zoom: int) -> str:
        token = GoogleOfficialProvider._session_token or self._session()
        return (f"https://tile.googleapis.com/v1/2dtiles/{zoom}/{x}/{y}"
                f"?session={token}&key={self.api_key}")


def get_provider(name: str | None = None) -> ImageryProvider:
    """Resolve a provider by name; default honors SATELLITE_PROVIDER env."""
    want = (name or os.getenv("SATELLITE_PROVIDER", EsriWorldImageryProvider.name)).lower()
    if want == GoogleOfficialProvider.name:
        try:
            return GoogleOfficialProvider()
        except RuntimeError:
            return EsriWorldImageryProvider()
    return EsriWorldImageryProvider()
