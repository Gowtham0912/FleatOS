import { useEffect, useRef, useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { formatDistanceToNow } from 'date-fns'


const PREDICTION_TIMEOUT_MS = 10000

// Helper to calculate distance in meters
function getDistance(p1, p2) {
  const R = 6371e3
  const dLat = (p2.lat - p1.lat) * Math.PI / 180
  const dLon = (p2.lng - p1.lng) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Helper to calculate heading (0-360)
function getHeading(p1, p2) {
  const lat1 = p1.lat * Math.PI / 180
  const lat2 = p2.lat * Math.PI / 180
  const dLon = (p2.lng - p1.lng) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  let brng = Math.atan2(y, x) * 180 / Math.PI
  return (brng + 360) % 360
}

function getContinuousRotation(current, target) {
  let diff = target - current
  diff = ((diff + 180) % 360) - 180
  if (diff < -180) diff += 360 // edge case
  return current + diff
}

const ICONS_SVG = {
  car: `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
  motorcycle: `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 14v-4l4-4 5 4"/><path d="M9 17h5"/><path d="M14 14l-3-4-2 3"/></svg>`,
  bus: `<svg viewBox="0 0 24 24" width="100%" height="100%" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`
}

const vehicleIcon = (isSelected, vehicleType = 'car') => {
  const svg = ICONS_SVG[vehicleType] || ICONS_SVG.car
  return L.divIcon({
    className: 'vehicle-marker-icon',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: ${isSelected ? '36px' : '30px'};
          height: ${isSelected ? '36px' : '30px'};
          border-radius: 50%;
          background: ${isSelected ? 'rgba(37, 99, 235, 0.25)' : 'rgba(2, 132, 199, 0.2)'};
          animation: pulse 2s infinite;
        "></div>
        <div class="vehicle-icon-inner" style="
          position: relative;
          width: ${isSelected ? '24px' : '20px'};
          height: ${isSelected ? '24px' : '20px'};
          border-radius: 50%;
          background: ${isSelected ? '#2563EB' : '#0284C7'};
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 65%; height: 65%; transform: rotate(0deg); display: flex; align-items: center; justify-content: center;">
            ${svg}
          </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

export default function AnimatedMarker({
  vehicle,
  location,
  isSelected,
  onInterpolatedPosition,
}) {
  const markerRef = useRef(null)
  const animationRef = useRef(null)

  const animState = useRef({
    startTime: null,
    duration: 2000,
    route: [],      // array of {lat, lng}
    totalDist: 0,   // total distance of route
    segments: [],   // precalculated distances between route points
    startRot: 0,
    targetRot: 0,
    currentRot: 0,
    lastPingTime: null,
    speed: 0,       // m/s for prediction
  })

  // Display state
  const currentPos = useRef(null)

  const icon = useMemo(() => vehicleIcon(isSelected, vehicle.vehicle_type), [isSelected, vehicle.vehicle_type])

  useEffect(() => {
    if (!location) return

    // Use raw GPS coordinates so the marker updates every second as sent by the device
    const newLat = location.latitude
    const newLng = location.longitude
    const now = performance.now()
    const state = animState.current

    if (state.lastPingTime) {
      const pingInterval = now - state.lastPingTime
      state.duration = Math.min(Math.max(pingInterval, 500), 15000)
    } else {
      state.duration = 2000
    }
    state.lastPingTime = now
    
    let geom = []
    if (location.route_geometry && location.route_geometry.coordinates) {
      geom = location.route_geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))
    }

    if (!currentPos.current) {
      // First ping
      currentPos.current = { lat: newLat, lng: newLng }
      state.currentRot = location.heading || 0
      state.route = []
      
      const marker = markerRef.current
      if (marker) {
        marker.setLatLng([newLat, newLng])
        const el = marker.getElement()
        if (el) {
          const inner = el.querySelector('.vehicle-icon-inner')
          if (inner) inner.style.transform = `rotate(${state.currentRot}deg)`
        }
      }
      if (onInterpolatedPosition) {
        onInterpolatedPosition(vehicle.id, newLat, newLng)
      }
      return
    }

    // Build the new route starting from our current interpolated position
    // to avoid jumps.
    const route = [ { ...currentPos.current } ]
    
    // Add geometry points if they are far enough from our current pos
    if (geom.length > 1) {
      let closestIdx = 0
      let minDt = Infinity
      for (let i = 0; i < geom.length; i++) {
        const d = getDistance(currentPos.current, geom[i])
        if (d < minDt) {
          minDt = d
          closestIdx = i
        }
      }
      
      for (let i = closestIdx + 1; i < geom.length; i++) {
        route.push(geom[i])
      }
    }
    
    if (route.length === 1) {
      route.push({ lat: newLat, lng: newLng })
    } else {
      // Force the exact target as the last point
      route[route.length - 1] = { lat: newLat, lng: newLng }
    }

    // Precalculate distances
    let totalDist = 0
    const segments = []
    for (let i = 0; i < route.length - 1; i++) {
      const d = getDistance(route[i], route[i+1])
      segments.push({ start: route[i], end: route[i+1], dist: d })
      totalDist += d
    }

    state.route = route
    state.totalDist = totalDist
    state.segments = segments
    state.startTime = now
    
    // Rotation
    state.startRot = state.currentRot
    
    // Calculate expected heading
    let expectedHeading = location.heading
    if (!expectedHeading && route.length > 1) {
      expectedHeading = getHeading(route[route.length - 2], route[route.length - 1])
    }

    // Anti-jitter: If the vehicle moved less than 1 meter, it's likely just stationary GPS noise.
    // Keep the previous heading and set speed to 0 so it doesn't wildly rotate or predict forward.
    if (totalDist < 1) {
      expectedHeading = state.startRot
      state.speed = 0
    } else {
      state.speed = location.speed || (totalDist / (state.duration / 1000))
    }

    state.targetRot = getContinuousRotation(state.startRot, expectedHeading || 0)

  }, [location, vehicle.id, onInterpolatedPosition])

  useEffect(() => {
    let running = true
    let lastCallbackTime = 0
    const CALLBACK_THROTTLE_MS = 150

    function animate(now) {
      if (!running) return

      const marker = markerRef.current
      const state = animState.current
      
      if (marker && state.startTime !== null && state.route.length > 1) {
        const elapsed = now - state.startTime
        const duration = state.duration || 2000
        
        let rawT = elapsed / duration
        let lat, lng, rot
        
        if (rawT <= 1) {
          // Normal interpolation along route
          const targetDist = rawT * state.totalDist
          let distSoFar = 0
          let currentSeg = state.segments[0]
          
          for (const seg of state.segments) {
            if (distSoFar + seg.dist >= targetDist) {
              currentSeg = seg
              break
            }
            distSoFar += seg.dist
          }
          
          const segT = currentSeg.dist > 0 ? (targetDist - distSoFar) / currentSeg.dist : 1
          lat = lerp(currentSeg.start.lat, currentSeg.end.lat, segT)
          lng = lerp(currentSeg.start.lng, currentSeg.end.lng, segT)
          
          // Interpolate rotation
          rot = lerp(state.startRot, state.targetRot, rawT)
          
          // Also orient slightly to the current segment heading if we want, but simple lerp to target is smoother.
        } else {
          // Animation finished, hold at final position (prevents overshoot/rubber-banding)
          lat = state.route[state.route.length - 1].lat
          lng = state.route[state.route.length - 1].lng
          rot = state.targetRot
        }

        currentPos.current = { lat, lng }
        state.currentRot = rot
        
        marker.setLatLng([lat, lng])
        
        // Update DOM element rotation
        const el = marker.getElement()
        if (el) {
          const inner = el.querySelector('.vehicle-icon-inner')
          if (inner) inner.style.transform = `rotate(${rot}deg)`
        }

        if (onInterpolatedPosition && (now - lastCallbackTime > CALLBACK_THROTTLE_MS)) {
          lastCallbackTime = now
          onInterpolatedPosition(vehicle.id, lat, lng)
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
          <p style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>
            {vehicle.name}
          </p>
          <p style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', marginBottom: '6px' }}>
            {vehicle.device_id}
          </p>
          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '6px 0' }} />
          <p style={{ fontSize: '11px', color: '#334155', fontWeight: 500 }}>
            {(location.latitude).toFixed(6)}, {(location.longitude).toFixed(6)}
          </p>
          <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px' }}>
            {formatDistanceToNow(new Date(location.timestamp), { addSuffix: true })}
          </p>
          {location.speed !== undefined && (
            <p style={{ fontSize: '10px', color: '#0284C7', marginTop: '3px', fontWeight: 600 }}>
              {(location.speed * 3.6).toFixed(1)} km/h
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}
