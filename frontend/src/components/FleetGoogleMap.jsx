import { useEffect, useState, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, PolylineF } from '@react-google-maps/api'
import AnimatedGoogleMarker from './AnimatedGoogleMarker'

const containerStyle = {
  width: '100%',
  height: '100%'
}

export default function FleetGoogleMap({ vehicles, locations, selectedVehicle, lastWsMessage, onInterpolatedPositions }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  })

  const [map, setMap] = useState(null)
  const [userCenter, setUserCenter] = useState(null)
  const lastVehicleIdRef = useRef(null)

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
        (pos) => setUserCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [locations])

  const [initialCenter, setInitialCenter] = useState(null)
  const [initialZoom, setInitialZoom] = useState(5)

  useEffect(() => {
    if (!initialCenter) {
      const firstLoc = Object.values(locations)[0]
      if (firstLoc) {
        setInitialCenter({
          lat: firstLoc.matched_latitude ?? firstLoc.latitude,
          lng: firstLoc.matched_longitude ?? firstLoc.longitude
        })
        setInitialZoom(13)
      } else if (userCenter) {
        setInitialCenter(userCenter)
        setInitialZoom(13)
      }
    }
  }, [locations, userCenter, initialCenter])

  const DEFAULT_CENTER = { lat: 20.0, lng: 78.0 }

  const flyTarget = selectedVehicle && locations[selectedVehicle.id]
    ? {
        lat: locations[selectedVehicle.id].matched_latitude ?? locations[selectedVehicle.id].latitude, 
        lng: locations[selectedVehicle.id].matched_longitude ?? locations[selectedVehicle.id].longitude
      }
    : null

  const onLoad = useCallback(function callback(map) {
    setMap(map)
  }, [])

  const onUnmount = useCallback(function callback(map) {
    setMap(null)
  }, [])

  // Handle map panning when vehicle is selected
  useEffect(() => {
    if (map && selectedVehicle?.id && selectedVehicle.id !== lastVehicleIdRef.current && flyTarget) {
      lastVehicleIdRef.current = selectedVehicle.id
      map.panTo(flyTarget)
      if (map.getZoom() < 15) {
        map.setZoom(15)
      }
    } else if (!selectedVehicle?.id) {
      lastVehicleIdRef.current = null
    }
  }, [map, selectedVehicle, flyTarget])

  if (loadError) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-slate-100 text-slate-500">
        <div>Map cannot be loaded right now, sorry.</div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-slate-100 text-slate-500">
        <div>Loading Maps...</div>
      </div>
    )
  }

  // Calculate polyline path for the selected vehicle if it has history (route_geometry)
  let selectedVehiclePath = null;
  if (selectedVehicle && locations[selectedVehicle.id]) {
    const loc = locations[selectedVehicle.id];
    if (loc.route_geometry && loc.route_geometry.coordinates) {
      selectedVehiclePath = loc.route_geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
    }
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={initialCenter || DEFAULT_CENTER}
      zoom={initialZoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        mapId: "DEMO_MAP_ID", // Modern vector map support if needed
      }}
    >
      {/* Route History Polyline */}
      {selectedVehiclePath && (
        <PolylineF
          path={selectedVehiclePath}
          options={{
            strokeColor: '#3b82f6', // Tailwind blue-500
            strokeOpacity: 0.8,
            strokeWeight: 4,
            geodesic: true
          }}
        />
      )}

      {vehicles.map((vehicle) => {
        const loc = locations[vehicle.id]
        if (!loc) return null

        const isSelected = selectedVehicle?.id === vehicle.id

        return (
          <AnimatedGoogleMarker
            key={vehicle.id}
            vehicle={vehicle}
            location={loc}
            isSelected={isSelected}
            onInterpolatedPosition={handleInterpolatedPosition}
          />
        )
      })}
    </GoogleMap>
  )
}
