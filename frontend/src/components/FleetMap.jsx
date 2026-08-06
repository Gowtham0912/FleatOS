import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import L from 'leaflet'
import { formatDistanceToNow } from 'date-fns'

// ── Clean simple marker icon ────────────────────────────────────────────────
const vehicleIcon = (isSelected) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: ${isSelected ? '24px' : '20px'};
          height: ${isSelected ? '24px' : '20px'};
          border-radius: 50%;
          background: ${isSelected ? '#2563EB' : '#0284C7'};
          border: 3px solid #FFFFFF;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          transition: all 0.2s ease;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })

/**
 * MapFlyTo — imperative component to pan/zoom to a target position.
 */
function MapFlyTo({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 1.2 })
    }
  }, [map, position])
  return null
}

/**
 * FleetMap — Leaflet map showing all vehicle markers.
 */
export default function FleetMap({ vehicles, locations, selectedVehicle, lastWsMessage }) {
  const [userCenter, setUserCenter] = useState(null)

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
    ? [firstLocation.latitude, firstLocation.longitude]
    : (userCenter || DEFAULT_CENTER)
  const initialZoom = (firstLocation || userCenter) ? 13 : DEFAULT_ZOOM

  const flyTarget = selectedVehicle && locations[selectedVehicle.id]
    ? [locations[selectedVehicle.id].latitude, locations[selectedVehicle.id].longitude]
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

      {flyTarget && <MapFlyTo position={flyTarget} />}

      {vehicles.map((vehicle) => {
        const loc = locations[vehicle.id]
        if (!loc) return null

        const isSelected = selectedVehicle?.id === vehicle.id
        const position   = [loc.latitude, loc.longitude]

        return (
          <Marker
            key={vehicle.id}
            position={position}
            icon={vehicleIcon(isSelected)}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '170px' }}>
                <p style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>
                  {vehicle.name}
                </p>
                <p style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', marginBottom: '6px' }}>
                  {vehicle.device_id}
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '6px 0' }} />
                <p style={{ fontSize: '11px', color: '#334155', fontWeight: 500 }}>
                  {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                </p>
                <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px' }}>
                  {formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true })}
                </p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
