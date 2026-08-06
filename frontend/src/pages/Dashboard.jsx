import { useState } from 'react'
import FleetMap from '../components/FleetMap'
import VehicleList from '../components/VehicleList'
import TopBar from '../components/TopBar'

/**
 * Dashboard page — simple clean live-tracking view.
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

          {/* Selected vehicle info overlay (bottom-left) */}
          {selectedVehicle && locations[selectedVehicle.id] && (
            <div className="absolute bottom-5 left-5 bg-white border border-slate-200 shadow-md rounded-lg px-4 py-3 animate-slide-in">
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-0.5">Selected Device</p>
              <p className="text-sm font-bold text-slate-900">{selectedVehicle.name}</p>
              <p className="text-xs font-mono text-slate-600 mt-0.5">
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
