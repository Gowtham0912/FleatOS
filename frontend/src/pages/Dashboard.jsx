import { useState, useCallback } from 'react'
import { Map, List } from 'lucide-react'
import FleetMap from '../components/FleetMap'
import VehicleList from '../components/VehicleList'
import TopBar from '../components/TopBar'
import { deleteVehicle, deleteUnlinkedVehicles } from '../api/fleetApi'

/**
 * Dashboard page — simple clean live-tracking view with mobile tabs.
 */
export default function Dashboard({ vehicles, locations, isLoading, lastMessage, isConnected, onRefresh, onToggleMobileMenu }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [activeTab, setActiveTab] = useState('map') // 'map' | 'list'

  // Interpolated positions from AnimatedMarker for live coordinate display
  const [interpolatedPositions, setInterpolatedPositions] = useState({})

  const handleInterpolatedPositions = useCallback((positions) => {
    setInterpolatedPositions(positions)
  }, [])

  const handleSelect = (vehicle) => {
    setSelectedVehicle((prev) => prev?.id === vehicle.id ? null : vehicle)
    // Switch to map view on mobile when vehicle selected
    setActiveTab('map')
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
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* ── Mobile View Toggle Pill (visible only on < md screens) ────────────── */}
      <div className="md:hidden flex items-center justify-center p-2 bg-slate-100 border-b border-slate-200 shrink-0">
        <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 w-full max-w-xs shadow-xs">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map size={14} />
            <span>Map View</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List size={14} />
            <span>Devices ({vehicles.length})</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* ── Map ──────────────────────────────────────────────────────── */}
        <div className={`flex-1 relative ${activeTab === 'map' ? 'block' : 'hidden md:block'}`}>
          <FleetMap
            vehicles={vehicles}
            locations={locations}
            selectedVehicle={selectedVehicle}
            lastWsMessage={lastMessage}
            onInterpolatedPositions={handleInterpolatedPositions}
          />

          {/* Overlay: no vehicles hint */}
          {!isLoading && vehicles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 z-10">
              <div className="bg-white border border-slate-200 shadow-md rounded-xl px-6 py-5 text-center max-w-xs pointer-events-auto">
                <p className="text-3xl mb-2">📱</p>
                <p className="text-sm font-bold text-slate-900 mb-1">No devices active</p>
                <p className="text-xs text-slate-500">
                  Click <strong className="text-blue-600">Connect GPS</strong> above to start tracking.
                </p>
              </div>
            </div>
          )}

          {/* Selected vehicle info overlay (bottom-left) — shows live interpolated coords */}
          {selectedVehicle && locations[selectedVehicle.id] && (() => {
            const coords = getDisplayCoords(selectedVehicle.id)
            return coords ? (
              <div className="absolute bottom-4 left-4 z-10 bg-white border border-slate-200 shadow-md rounded-lg px-3.5 py-2.5 max-w-[240px] animate-slide-in">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Live Tracking</p>
                </div>
                <p className="text-xs md:text-sm font-bold text-slate-900 truncate">{selectedVehicle.name}</p>
                <p className="text-[11px] md:text-xs font-mono text-slate-600 mt-0.5">
                  {coords.latitude.toFixed(6)},{' '}
                  {coords.longitude.toFixed(6)}
                </p>
              </div>
            ) : null
          })()}
        </div>

        {/* ── Vehicle list panel ────────────────────────────────────────── */}
        <div className={`w-full md:w-80 h-full ${activeTab === 'list' ? 'block' : 'hidden md:block'}`}>
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
    </div>
  )
}

