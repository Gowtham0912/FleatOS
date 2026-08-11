import { RefreshCw, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import VehicleCard from './VehicleCard'

/**
 * VehicleList — scrollable panel listing tracked vehicles.
 */
export default function VehicleList({ vehicles, locations, selectedVehicle, onSelect, onDelete, onClearUnlinked, onRefresh, isLoading }) {
  const [query, setQuery] = useState('')

  const unlinkedCount = vehicles.filter((v) => v.user_id === null).length

  const filtered = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.device_id.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full w-full bg-white border-t md:border-t-0 md:border-l border-slate-200 shrink-0">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold text-slate-900">
            Vehicles & Devices
            <span className="ml-1.5 text-xs text-slate-500 font-medium">
              ({vehicles.length})
            </span>
          </h2>
          <div className="flex items-center gap-1">
            {unlinkedCount > 0 && onClearUnlinked && (
              <button
                onClick={onClearUnlinked}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                title={`Clean up ${unlinkedCount} unlinked guest devices`}
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Refresh list"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* ── Vehicle cards ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <RefreshCw size={18} className="animate-spin mb-2 text-slate-400" />
            <p className="text-xs">Loading vehicles…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-center px-4">
            <p className="text-xs font-semibold text-slate-600 mb-1">No vehicles found</p>
            <p className="text-xs text-slate-400">
              {vehicles.length === 0
                ? 'Scan the QR code to connect your first phone.'
                : 'Try typing a different name.'}
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
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
