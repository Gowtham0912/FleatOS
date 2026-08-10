import { useState, useCallback } from 'react'
import FleetMap from '../components/FleetMap'
import VehicleList from '../components/VehicleList'
import TopBar from '../components/TopBar'
import { deleteVehicle, deleteUnlinkedVehicles } from '../api/fleetApi'

/**
 * Dashboard page — simple clean live-tracking view.
 */
export default function Dashboard({ vehicles, locations, isLoading, lastMessage, isConnected, onRefresh }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  // Interpolated positions from AnimatedMarker for live coordinate display
  const [interpolatedPositions, setInterpolatedPositions] = useState({})

  const handleInterpolatedPositions = useCallback((positions) => {
    setInterpolatedPositions(positions)
  }, [])

  const handleSelect = (vehicle) => {
    setSelectedVehicle((prev) => prev?.id === vehicle.id ? null : vehicle)
  }

  const handleDelete = async (vehicleId) => {
    try {
      await deleteVehicle(vehicleId)
      if (selectedVehicle?.id === vehicleId) setSelectedVehicle(null)
      if (onRefresh) onRefresh()
    } catch (err) {
      alert('Failed to delete vehicle: ' + err.message)
    }
  }

  const handleClearUnlinked = async () => {
    try {
      await deleteUnlinkedVehicles()
      if (onRefresh) onRefresh()
    } catch (err) {
      alert('Failed to clear unlinked devices: ' + err.message)
    }
  }

  // Use interpolated position if available, otherwise fall back to raw GPS
  const getDisplayCoords = (vehicleId) => {
    const interp = interpolatedPositions[vehicleId]
    if (interp) return interp
    const loc = locations[vehicleId]
    if (loc) return { latitude: loc.latitude, longitude: loc.longitude }
    return null
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        title="Live Map"
        isConnected={isConnected}
        lastMessage={lastMessage}
        onVehicleAdded={onRefresh}
      />

      <div className="flex flex-1 min-h-0">
        {/* ── Map ──────────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          <FleetMap
            vehicles={vehicles}
            locations={locations}
            selectedVehicle={selectedVehicle}
            lastWsMessage={lastMessage}
            onInterpolatedPositions={handleInterpolatedPositions}
          />

          {/* Overlay: no vehicles hint */}
          {!isLoading && vehicles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              <div className="bg-white border border-slate-200 shadow-md rounded-xl px-6 py-5 text-center max-w-xs">
                <p className="text-3xl mb-2">📱</p>
                <p className="text-sm font-bold text-slate-900 mb-1">No devices active</p>
                <p className="text-xs text-slate-500">
                  Click <strong className="text-blue-600">Connect Phone</strong> above to start tracking.
                </p>
              </div>
            </div>
          )}

          {/* Selected vehicle info overlay (bottom-left) — shows live interpolated coords */}
          {selectedVehicle && locations[selectedVehicle.id] && (() => {
            const coords = getDisplayCoords(selectedVehicle.id)
            return coords ? (
              <div className="absolute bottom-5 left-5 bg-white border border-slate-200 shadow-md rounded-lg px-4 py-3 animate-slide-in">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Live Tracking</p>
                </div>
                <p className="text-sm font-bold text-slate-900">{selectedVehicle.name}</p>
                <p className="text-xs font-mono text-slate-600 mt-0.5">
                  {coords.latitude.toFixed(6)},{' '}
                  {coords.longitude.toFixed(6)}
                </p>
              </div>
            ) : null
          })()}
        </div>

        {/* ── Vehicle list panel ────────────────────────────────────────── */}
        <VehicleList
          vehicles={vehicles}
          locations={locations}
          selectedVehicle={selectedVehicle}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onClearUnlinked={handleClearUnlinked}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
