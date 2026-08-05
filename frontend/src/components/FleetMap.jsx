import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { formatDistanceToNow } from 'date-fns'

// ── Custom marker icon ─────────────────────────────────────────────────────
const vehicleIcon = (isSelected) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Pulse ring -->
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${isSelected ? 'rgba(100,255,218,0.25)' : 'rgba(100,255,218,0.15)'};
          animation: markerPulse 2s ease-in-out infinite;
        "></div>
        <!-- Core dot -->
        <div style="
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #64FFDA;
          border: 2.5px solid #0F172A;
          box-shadow: 0 0 12px rgba(100,255,218,0.7);
          z-index: 1;
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
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
 * Animates to selected vehicle and flies on WS update.
 */
export default function FleetMap({ vehicles, locations, selectedVehicle, lastWsMessage }) {
  const DEFAULT_CENTER = [20.0, 78.0]   // India centre — fallback
  const DEFAULT_ZOOM   = 5

  // Determine initial centre: first vehicle with location, or default
  const firstLocation = Object.values(locations)[0]
  const initialCenter = firstLocation
    ? [firstLocation.latitude, firstLocation.longitude]
    : DEFAULT_CENTER
  const initialZoom = firstLocation ? 15 : DEFAULT_ZOOM

  // Selected vehicle's current location for FlyTo
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

      {/* Fly to selected vehicle */}
      {flyTarget && <MapFlyTo position={flyTarget} />}

      {/* Render a marker for every vehicle that has a location */}
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
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '180px' }}>
                <p style={{ fontWeight: 700, fontSize: '14px', color: '#F1F5F9', marginBottom: '6px' }}>
                  {vehicle.name}
                </p>
                <p style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', marginBottom: '4px' }}>
                  {vehicle.device_id}
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '8px 0' }} />
                <p style={{ fontSize: '12px', color: '#CBD5E1' }}>
                  {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                </p>
                <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
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
