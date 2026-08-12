"""
Google Maps Roads API client.
"""

import httpx
import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

async def snap_to_roads(coordinates: list[tuple[float, float]]) -> dict[str, Any] | None:
    """
    Call Google Maps Roads API to snap a sequence of GPS coordinates to the road network.
    
    :param coordinates: List of (longitude, latitude) tuples.
    :return: The matched response from Google, or None if it fails.
    """
    if not settings.MAP_MATCHING_ENABLED:
        return None
        
    if not settings.GOOGLE_MAPS_API_KEY:
        logger.warning("Google Maps API Key not set for backend! Skipping snap_to_roads.")
        return None
        
    if not coordinates or len(coordinates) < 2:
        return None

    # Google Maps Roads API expects coordinates as lat,lon|lat,lon|...
    # Note: Our input is (longitude, latitude), so we must flip them for Google!
    coords_str = "|".join([f"{lat:.6f},{lon:.6f}" for lon, lat in coordinates])
    
    url = "https://roads.googleapis.com/v1/snapToRoads"
    
    params = {
        "path": coords_str,
        "interpolate": "true",
        "key": settings.GOOGLE_MAPS_API_KEY
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "snappedPoints" in data:
                return data
            else:
                logger.warning("Google Roads API returned unexpected format or empty: %s", data)
                return None
    except httpx.HTTPStatusError as exc:
        logger.error("HTTP error from Google Roads API: %s - %s", exc.response.status_code, exc.response.text)
        return None
    except Exception as exc:
        logger.error("Error connecting to Google Roads API: %s", exc)
        return None
