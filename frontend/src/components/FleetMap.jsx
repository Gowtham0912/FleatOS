import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useState, useCallback, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import AnimatedMarker from './AnimatedMarker'

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
export default function FleetMap({ vehicles, locations, selectedVehicle, lastWsMessage, onInterpolatedPositions }) {
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

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {flyTarget && <MapFlyTo vehicleId={selectedVehicle?.id} position={flyTarget} />}

      {vehicles.map((vehicle) => {
        const loc = locations[vehicle.id]
        if (!loc) return null

        const isSelected = selectedVehicle?.id === vehicle.id

        return (
          <AnimatedMarker
            key={vehicle.id}
            vehicle={vehicle}
            location={loc}
            isSelected={isSelected}
            onInterpolatedPosition={handleInterpolatedPosition}
          />
        )
      })}
    </MapContainer>
  )
}
