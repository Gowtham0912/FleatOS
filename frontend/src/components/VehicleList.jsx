import { RefreshCw, Search } from 'lucide-react'
import { useState } from 'react'
import VehicleCard from './VehicleCard'

/**
 * VehicleList — scrollable panel listing all tracked vehicles.
 */
export default function VehicleList({ vehicles, locations, selectedVehicle, onSelect, onRefresh, isLoading }) {
  const [query, setQuery] = useState('')

  const filtered = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.device_id.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-navy-900 border-l border-navy-700 w-80 shrink-0">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-navy-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">
            Vehicles
            <span className="ml-2 text-xs text-slate-400 font-normal">
              ({vehicles.length})
            </span>
          </h2>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-navy-800 transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search vehicles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 transition-colors"
          />
        </div>
      </div>

      {/* ── Vehicle cards ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <RefreshCw size={20} className="animate-spin mb-2" />
            <p className="text-xs">Loading vehicles…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-center px-4">
            <p className="text-sm font-medium mb-1">No vehicles found</p>
            <p className="text-xs">
              {vehicles.length === 0
                ? 'Start the Android app to see your device here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          filtered.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              location={locations[vehicle.id]}
              isSelected={selectedVehicle?.id === vehicle.id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
