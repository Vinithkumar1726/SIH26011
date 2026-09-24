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
    """Google Maps tiles via official API key (env GOOGLE_MAPS_API_KEY).

    Raises at construction when no key is configured so the pipeline can
    fall back instead of scraping tile servers.
    """

    name = "google-official"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GOOGLE_MAPS_API_KEY")
        if not self.api_key:
            raise RuntimeError("GOOGLE_MAPS_API_KEY is not configured")

    def tile_url(self, x: int, y: int, zoom: int) -> str:
        return f"https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={zoom}&key={self.api_key}"


def get_provider(name: str | None = None) -> ImageryProvider:
    """Resolve a provider by name; default honors SATELLITE_PROVIDER env."""
    want = (name or os.getenv("SATELLITE_PROVIDER", EsriWorldImageryProvider.name)).lower()
    if want == GoogleOfficialProvider.name:
        try:
            return GoogleOfficialProvider()
        except RuntimeError:
            return EsriWorldImageryProvider()
    return EsriWorldImageryProvider()
