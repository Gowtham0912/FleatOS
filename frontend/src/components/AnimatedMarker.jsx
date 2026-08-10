import { useEffect, useRef, useMemo } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { formatDistanceToNow } from 'date-fns'

/**
 * INTERPOLATION_DURATION_MS — the time over which the marker animates
 * from its previous position to the new one. Should match the GPS send
 * interval (~5 s) so the marker arrives just as the next ping comes in.
 */
const INTERPOLATION_DURATION_MS = 5000

/**
 * FRAME_INTERVAL_MS — minimum ms between position updates to avoid
 * excessive Leaflet DOM thrash. ~60 fps = 16 ms.
 */
const FRAME_INTERVAL_MS = 16

/**
 * vehicleIcon — returns a Leaflet divIcon for the vehicle dot.
 */
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
          transition: width 0.2s ease, height 0.2s ease, background 0.2s ease;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })

/**
 * Linear interpolation between two values.
 */
function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * Easing function — ease-in-out cubic for natural movement feel.
 */
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * AnimatedMarker — a Leaflet marker that smoothly interpolates
 * its position from the previous GPS coordinate to the latest one,
 * using requestAnimationFrame for butter-smooth 60fps animation.
 *
 * This eliminates the "jumping every 5 seconds" problem and makes
 * the vehicle appear to move continuously in real time.
 */
export default function AnimatedMarker({
  vehicle,
  location,
  isSelected,
  onInterpolatedPosition,
}) {
  const markerRef = useRef(null)
  const animationRef = useRef(null)

  // Track previous and current target positions
  const prevLatLng = useRef(null)
  const targetLatLng = useRef(null)
  const animStartTime = useRef(null)

  // Current interpolated position for display
  const currentPos = useRef(null)

  const icon = useMemo(() => vehicleIcon(isSelected), [isSelected])

  // When a new location arrives, start a fresh interpolation
  useEffect(() => {
    if (!location) return

    const newLat = location.latitude
    const newLng = location.longitude

    // If this is the very first position, snap immediately
    if (!targetLatLng.current) {
      prevLatLng.current = { lat: newLat, lng: newLng }
      targetLatLng.current = { lat: newLat, lng: newLng }
      currentPos.current = { lat: newLat, lng: newLng }

      // Snap marker
      const marker = markerRef.current
      if (marker) {
        marker.setLatLng([newLat, newLng])
      }
      if (onInterpolatedPosition) {
        onInterpolatedPosition(vehicle.id, newLat, newLng)
      }
      return
    }

    // Skip if position hasn't actually changed
    if (
      targetLatLng.current.lat === newLat &&
      targetLatLng.current.lng === newLng
    ) {
      return
    }

    // Set the current interpolated position as the new "from" point
    // (so mid-animation updates don't cause jumps)
    prevLatLng.current = currentPos.current
      ? { ...currentPos.current }
      : { ...targetLatLng.current }
    targetLatLng.current = { lat: newLat, lng: newLng }
    animStartTime.current = performance.now()
  }, [location, vehicle.id, onInterpolatedPosition])

  // Main animation loop using requestAnimationFrame
  useEffect(() => {
    let running = true
    let lastCallbackTime = 0
    const CALLBACK_THROTTLE_MS = 200 // update overlay coords ~5×/sec

    function animate(now) {
      if (!running) return

      const marker = markerRef.current
      const from = prevLatLng.current
      const to = targetLatLng.current

      if (marker && from && to) {
        const startTime = animStartTime.current
        if (startTime !== null) {
          const elapsed = now - startTime
          const rawT = Math.min(elapsed / INTERPOLATION_DURATION_MS, 1)
          const t = easeInOutCubic(rawT)

          const lat = lerp(from.lat, to.lat, t)
          const lng = lerp(from.lng, to.lng, t)

          currentPos.current = { lat, lng }
          marker.setLatLng([lat, lng])

          // Throttle the React callback to avoid excessive re-renders
          if (
            onInterpolatedPosition &&
            (now - lastCallbackTime > CALLBACK_THROTTLE_MS || rawT >= 1)
          ) {
            lastCallbackTime = now
            onInterpolatedPosition(vehicle.id, lat, lng)
          }

          // Animation complete — snap exactly to target
          if (rawT >= 1) {
            animStartTime.current = null
            prevLatLng.current = { ...to }
            currentPos.current = { ...to }
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      running = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [vehicle.id, onInterpolatedPosition])

  // Initial position (will be overridden by animation immediately)
  const initialPos = location
    ? [location.latitude, location.longitude]
    : [0, 0]

  if (!location) return null

  return (
    <Marker
      ref={markerRef}
      position={initialPos}
      icon={icon}
    >
      <Popup>
        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '170px' }}>
          <p
            style={{
              fontWeight: 700,
              fontSize: '13px',
              color: '#0F172A',
              marginBottom: '2px',
            }}
          >
            {vehicle.name}
          </p>
          <p
            style={{
              fontSize: '11px',
              color: '#64748B',
              fontFamily: 'monospace',
              marginBottom: '6px',
            }}
          >
            {vehicle.device_id}
          </p>
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid #E2E8F0',
              margin: '6px 0',
            }}
          />
          <p style={{ fontSize: '11px', color: '#334155', fontWeight: 500 }}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </p>
          <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px' }}>
            {formatDistanceToNow(new Date(location.timestamp), {
              addSuffix: true,
            })}
          </p>
        </div>
      </Popup>
    </Marker>
  )
}
