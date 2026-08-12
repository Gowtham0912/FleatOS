import { useEffect, useRef, useMemo, useState } from 'react'
import { MarkerF, InfoWindowF } from '@react-google-maps/api'
import { formatDistanceToNow } from 'date-fns'

const INTERPOLATION_DURATION_MS = 5000
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

function lerp(a, b, t) {
  return a + (b - a) * t
}

export default function AnimatedGoogleMarker({
  vehicle,
  location,
  isSelected,
  onInterpolatedPosition,
}) {
  const markerRef = useRef(null)
  const animationRef = useRef(null)
  const [showInfoWindow, setShowInfoWindow] = useState(false)

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

  const currentPos = useRef(null)

  const getVehicleIcon = (selected, rotation) => {
    if (!window.google) return null;
    return {
      path: 'M12 2L2 22L12 18L22 22L12 2Z',
      fillColor: selected ? '#2563EB' : '#0284C7',
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 1.2,
      anchor: new window.google.maps.Point(12, 12),
      rotation: rotation
    }
  }

  const handleMarkerLoad = (marker) => {
    markerRef.current = marker
  }

  useEffect(() => {
    if (!location || !window.google) return

    const newLat = location.matched_latitude ?? location.latitude
    const newLng = location.matched_longitude ?? location.longitude
    const now = performance.now()
    const state = animState.current

    if (state.lastPingTime) {
      const pingInterval = now - state.lastPingTime
      state.duration = Math.min(Math.max(pingInterval, 1000), 5000)
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
        marker.setPosition({ lat: newLat, lng: newLng })
        marker.setIcon(getVehicleIcon(isSelected, state.currentRot))
      }
      if (onInterpolatedPosition) {
        onInterpolatedPosition(vehicle.id, newLat, newLng)
      }
      return
    }

    const route = [ { ...currentPos.current } ]
    
    if (geom.length > 1) {
      for (let i = 1; i < geom.length; i++) {
        route.push(geom[i])
      }
    } else {
      route.push({ lat: newLat, lng: newLng })
    }
    
    route[route.length - 1] = { lat: newLat, lng: newLng }

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
    
    state.startRot = state.currentRot
    
    let expectedHeading = location.heading
    if (!expectedHeading && route.length > 1) {
      expectedHeading = getHeading(route[route.length - 2], route[route.length - 1])
    }

    // Anti-jitter: If the vehicle moved less than 5 meters, it's likely just stationary GPS noise.
    // Keep the previous heading and set speed to 0 so it doesn't wildly rotate or predict forward.
    if (totalDist < 5) {
      expectedHeading = state.startRot
      state.speed = 0
    } else {
      state.speed = location.speed || (totalDist / (state.duration / 1000))
    }

    state.targetRot = getContinuousRotation(state.startRot, expectedHeading || 0)

  }, [location, vehicle.id, onInterpolatedPosition, isSelected])

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
          
          rot = lerp(state.startRot, state.targetRot, rawT)
        } else {
          const overtime = elapsed - duration
          if (overtime > PREDICTION_TIMEOUT_MS) {
            lat = state.route[state.route.length - 1].lat
            lng = state.route[state.route.length - 1].lng
            rot = state.targetRot
          } else {
            const lastPt = state.route[state.route.length - 1]
            const dist = state.speed * (overtime / 1000)
            const brng = state.targetRot * Math.PI / 180
            
            const R = 6371e3
            const lat1 = lastPt.lat * Math.PI / 180
            const lon1 = lastPt.lng * Math.PI / 180
            
            const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist / R) +
              Math.cos(lat1) * Math.sin(dist / R) * Math.cos(brng))
            const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist / R) * Math.cos(lat1),
              Math.cos(dist / R) - Math.sin(lat1) * Math.sin(lat2))
              
            lat = lat2 * 180 / Math.PI
            lng = lon2 * 180 / Math.PI
            rot = state.targetRot
          }
        }

        currentPos.current = { lat, lng }
        state.currentRot = rot
        
        marker.setPosition({ lat, lng })
        marker.setIcon(getVehicleIcon(isSelected, rot))

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
  }, [vehicle.id, onInterpolatedPosition, isSelected])

  const initialPos = location
    ? { lat: location.matched_latitude ?? location.latitude, lng: location.matched_longitude ?? location.longitude }
    : { lat: 0, lng: 0 }

  if (!location) return null

  return (
    <>
      <MarkerF
        onLoad={handleMarkerLoad}
        position={initialPos}
        icon={getVehicleIcon(isSelected, 0)}
        onClick={() => setShowInfoWindow(true)}
      />
      {showInfoWindow && currentPos.current && (
        <InfoWindowF
          position={currentPos.current}
          onCloseClick={() => setShowInfoWindow(false)}
          options={{ pixelOffset: new window.google.maps.Size(0, -20) }}
        >
          <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '170px' }}>
            <p style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '2px' }}>
              {vehicle.name}
            </p>
            <p style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', marginBottom: '6px' }}>
              {vehicle.device_id}
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '6px 0' }} />
            <p style={{ fontSize: '11px', color: '#334155', fontWeight: 500 }}>
              {(location.matched_latitude ?? location.latitude).toFixed(6)}, {(location.matched_longitude ?? location.longitude).toFixed(6)}
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
        </InfoWindowF>
      )}
    </>
  )
}
