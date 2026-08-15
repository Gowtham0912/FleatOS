import { MapContainer, TileLayer, useMap, LayersControl, LayerGroup, Polyline, CircleMarker, Marker } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useState, useCallback, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import AnimatedMarker from './AnimatedMarker'
import { BASE_URL } from '../api/fleetApi'

/**
 * MapFlyTo — imperative component to pan/zoom to a vehicle when selected.
 * Only triggers when selectedVehicle.id changes so the user can zoom and pan freely.
 */
function MapFlyTo({ vehicleId, position }) {
  const map = useMap()
  const lastVehicleIdRef = useRef(null)

  useEffect(() => {
    if (vehicleId && vehicleId !== lastVehicleIdRef.current && position) {
      lastVehicleIdRef.current = vehicleId
      map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 1.2 })
    } else if (!vehicleId) {
      lastVehicleIdRef.current = null
    }
  }, [map, vehicleId, position])

  return null
}

/**
 * FleetMap — Leaflet map showing all vehicle markers with smooth
 * real-time interpolation between GPS pings and breadcrumb route trails.
 */
export default function FleetMap({ vehicles, locations, locationHistory, selectedVehicle, lastWsMessage, onInterpolatedPositions, ownerLocation, ownerUser }) {
  const [userCenter, setUserCenter] = useState(null)

  // Track interpolated positions so the Dashboard overlay can show live coords
  const interpolatedRef = useRef({})

  const handleInterpolatedPosition = useCallback((vehicleId, lat, lng) => {
    interpolatedRef.current[vehicleId] = { latitude: lat, longitude: lng }
    if (onInterpolatedPositions) {
      onInterpolatedPositions({ ...interpolatedRef.current })
    }
  }, [onInterpolatedPositions])

  useEffect(() => {
    if (navigator.geolocation && Object.keys(locations).length === 0) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      )
    }
  }, [locations])

  const DEFAULT_CENTER = [20.0, 78.0]
  const DEFAULT_ZOOM   = 5

  const firstLocation = Object.values(locations)[0]
  const initialCenter = firstLocation
    ? [firstLocation.matched_latitude ?? firstLocation.latitude, firstLocation.matched_longitude ?? firstLocation.longitude]
    : (userCenter || DEFAULT_CENTER)
  const initialZoom = (firstLocation || userCenter) ? 13 : DEFAULT_ZOOM

  const flyTarget = selectedVehicle && locations[selectedVehicle.id]
    ? [
        locations[selectedVehicle.id].matched_latitude ?? locations[selectedVehicle.id].latitude, 
        locations[selectedVehicle.id].matched_longitude ?? locations[selectedVehicle.id].longitude
      ]
    : null

  let ownerAvatarUrl = ownerUser?.avatar_url
  if (ownerAvatarUrl && ownerAvatarUrl.startsWith('/')) {
    ownerAvatarUrl = `${BASE_URL}${ownerAvatarUrl}`
  }

  const ownerIcon = ownerUser ? L.divIcon({
    className: 'bg-transparent',
    html: `
      <div class="relative w-10 h-10">
        <div class="absolute inset-0 rounded-full border-2 border-[#17b385] overflow-hidden bg-white shadow-md z-10 flex items-center justify-center">
          <img src="${ownerAvatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(ownerUser.full_name || 'Owner') + '&background=f1f5f9&color=64748b'}" 
               class="w-full h-full object-cover" 
               alt="Owner" />
        </div>
        <div class="absolute inset-0 rounded-full bg-[#17b385] opacity-40 animate-ping z-0"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  }) : null

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
      attributionControl={false}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satellite">
          <LayerGroup>
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            />
          </LayerGroup>
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Dark Mode">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">Carto</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Light Mode">
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">Carto</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {flyTarget && <MapFlyTo vehicleId={selectedVehicle?.id} position={flyTarget} />}

      {vehicles.map((vehicle) => {
        const loc = locations[vehicle.id]
        if (!loc) return null

        const isSelected = selectedVehicle?.id === vehicle.id

        return (
          <LayerGroup key={vehicle.id}>
            <AnimatedMarker
              vehicle={vehicle}
              location={loc}
              isSelected={isSelected}
              onInterpolatedPosition={handleInterpolatedPosition}
            />
          </LayerGroup>
        )
      })}

      {ownerLocation && ownerUser && ownerIcon && (
        <LayerGroup key="owner-marker">
          <Marker 
            position={[ownerLocation.latitude, ownerLocation.longitude]} 
            icon={ownerIcon}
            zIndexOffset={1000}
          />
        </LayerGroup>
      )}
    </MapContainer>
  )
}
