import { useMemo, useState, useEffect, useRef } from 'react'
import { MarkerF, InfoWindowF } from '@react-google-maps/api'
import { formatDistanceToNow } from 'date-fns'

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end
}

export default function AnimatedGoogleMarker({
  vehicle,
  location,
  isSelected,
}) {
  const [showInfoWindow, setShowInfoWindow] = useState(false)
  const markerRef = useRef(null)
  const animRef = useRef(null)
  
  const currentPos = useRef(null)
  const targetPos = useRef(null)

  // Generate a distinct color for each vehicle based on its ID
  const vehicleColor = useMemo(() => {
    let hash = 0
    const str = vehicle.id || vehicle.device_id || 'unknown'
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 85%, 45%)`
  }, [vehicle.id, vehicle.device_id])

  // Simple WhatsApp-style smooth movement (Ease-out interpolation)
  useEffect(() => {
    if (!location || !window.google) return

    const newLat = location.latitude
    const newLng = location.longitude

    if (!currentPos.current) {
      // First time loading, snap immediately
      currentPos.current = { lat: newLat, lng: newLng }
      targetPos.current = { lat: newLat, lng: newLng }
      if (markerRef.current) markerRef.current.setPosition(currentPos.current)
      return
    }

    // Set new target
    targetPos.current = { lat: newLat, lng: newLng }
    
    // Start animation loop to slide smoothly to target
    const animate = () => {
      if (!currentPos.current || !targetPos.current) return
      
      const latDiff = Math.abs(targetPos.current.lat - currentPos.current.lat)
      const lngDiff = Math.abs(targetPos.current.lng - currentPos.current.lng)
      
      // If we are very close to the target, snap and stop animating
      if (latDiff < 0.000001 && lngDiff < 0.000001) {
        currentPos.current = targetPos.current
        if (markerRef.current) markerRef.current.setPosition(currentPos.current)
        return
      }
      
      // Move 5% closer to the target every frame (smooth glide effect)
      currentPos.current = {
        lat: lerp(currentPos.current.lat, targetPos.current.lat, 0.05),
        lng: lerp(currentPos.current.lng, targetPos.current.lng, 0.05)
      }
      
      if (markerRef.current) markerRef.current.setPosition(currentPos.current)
      animRef.current = requestAnimationFrame(animate)
    }
    
    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [location])

  if (!location) return null

  // Use simple heading provided by GPS if available, otherwise point North
  const heading = location.heading || 0

  const getVehicleIcon = () => {
    if (!window.google) return null;
    return {
      path: 'M12 2L2 22L12 18L22 22L12 2Z',
      fillColor: isSelected ? '#2563EB' : vehicleColor,
      fillOpacity: 1,
      strokeWeight: isSelected ? 3 : 2,
      strokeColor: '#FFFFFF',
      scale: isSelected ? 1.4 : 1.2,
      anchor: new window.google.maps.Point(12, 12),
      rotation: heading
    }
  }

  return (
    <>
      <MarkerF
        onLoad={(m) => { markerRef.current = m }}
        position={currentPos.current || { lat: location.latitude, lng: location.longitude }}
        icon={getVehicleIcon()}
        onClick={() => setShowInfoWindow(true)}
      />
      
      {showInfoWindow && (
        <InfoWindowF
          position={position}
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
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
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
