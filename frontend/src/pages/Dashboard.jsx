import { useState } from 'react'
import FleetMap from '../components/FleetMap'
import VehicleList from '../components/VehicleList'
import TopBar from '../components/TopBar'

/**
 * Dashboard page — the main live-tracking view.
 *
 * Layout:
 *   [Map fills centre] | [Vehicle list panel on right]
 */
export default function Dashboard({ vehicles, locations, isLoading, lastMessage, isConnected, onRefresh }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  const handleSelect = (vehicle) => {
    setSelectedVehicle((prev) => prev?.id === vehicle.id ? null : vehicle)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        title="Live Map"
        isConnected={isConnected}
        lastMessage={lastMessage}
      />

      <div className="flex flex-1 min-h-0">
        {/* ── Map ──────────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          <FleetMap
            vehicles={vehicles}
            locations={locations}
            selectedVehicle={selectedVehicle}
            lastWsMessage={lastMessage}
          />

          {/* Overlay: no vehicles hint */}
          {!isLoading && vehicles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="glass-card px-8 py-6 text-center">
                <p className="text-4xl mb-3">📱</p>
                <p className="text-sm font-semibold text-white mb-1">No vehicles tracked yet</p>
                <p className="text-xs text-slate-400">
                  Click <strong className="text-teal-400">Connect Phone</strong> above to get the QR code
                </p>
              </div>
            </div>
          )}

          {/* Selected vehicle info overlay (bottom-left) */}
          {selectedVehicle && locations[selectedVehicle.id] && (
            <div className="absolute bottom-6 left-6 glass-card px-4 py-3 animate-slide-in">
              <p className="text-xs text-teal-400 font-semibold mb-1">SELECTED</p>
              <p className="text-sm font-bold text-white">{selectedVehicle.name}</p>
              <p className="text-xs font-mono text-slate-300 mt-0.5">
                {locations[selectedVehicle.id].latitude.toFixed(6)},{' '}
                {locations[selectedVehicle.id].longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* ── Vehicle list panel ────────────────────────────────────────── */}
        <VehicleList
          vehicles={vehicles}
          locations={locations}
          selectedVehicle={selectedVehicle}
          onSelect={handleSelect}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
