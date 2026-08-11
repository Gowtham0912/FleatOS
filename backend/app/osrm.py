"""
OSRM Match service client.
"""

import httpx
import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

async def get_map_match(coordinates: list[tuple[float, float]], timestamps: list[int] = None) -> dict[str, Any] | None:
    """
    Call OSRM Match API to match a sequence of GPS coordinates to the road network.
    
    :param coordinates: List of (longitude, latitude) tuples. Note: OSRM takes lon,lat!
    :param timestamps: Optional list of timestamps (unix epoch in seconds) for each coordinate.
    :return: The matched response from OSRM, or None if it fails.
    """
    if not settings.MAP_MATCHING_ENABLED:
        return None
        
    if not coordinates or len(coordinates) < 2:
        return None

    # OSRM expects coordinates as lon,lat;lon,lat;...
    coords_str = ";".join([f"{lon:.6f},{lat:.6f}" for lon, lat in coordinates])
    
    url = f"{settings.OSRM_BASE_URL.rstrip('/')}/match/v1/driving/{coords_str}"
    
    params = {
        "geometries": "geojson",
        "overview": "full",
        "annotations": "true",
        "radiuses": ";".join(["15" for _ in coordinates])  # 15m radius for matching
    }
    
    if timestamps and len(timestamps) == len(coordinates):
        params["timestamps"] = ";".join(str(t) for t in timestamps)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            if data.get("code") == "Ok":
                return data
            else:
                logger.warning("OSRM Map Matching failed: %s", data.get("message", data.get("code")))
                return None
    except Exception as exc:
        logger.error("Error connecting to OSRM Match service: %s", exc)
        return None
