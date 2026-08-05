import { Truck, MapPin, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

/**
 * VehicleCard — a single vehicle row in the sidebar vehicle list.
 */
export default function VehicleCard({ vehicle, location, isSelected, onSelect }) {
  const hasLocation = !!location

  const lastSeen = hasLocation
    ? formatDistanceToNow(new Date(location.timestamp), { addSuffix: true })
    : 'No data yet'

  return (
    <button
      onClick={() => onSelect(vehicle)}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 animate-fade-in ${
        isSelected
          ? 'bg-teal-400/10 border-teal-400/30 teal-glow'
          : 'bg-navy-800 border-navy-700 hover:border-navy-600 hover:bg-navy-700'
      }`}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isSelected ? 'bg-teal-400/20' : 'bg-navy-700'
          }`}>
            <Truck size={14} className={isSelected ? 'text-teal-400' : 'text-slate-400'} />
          </div>
          <span className="text-sm font-semibold text-white truncate max-w-[120px]">
            {vehicle.name}
          </span>
        </div>
        <span className={`status-dot ${hasLocation ? 'active' : 'inactive'}`} />
      </div>

      {/* ── Device ID ──────────────────────────────────────────────────── */}
      <p className="text-xs text-slate-400 font-mono truncate mb-2">{vehicle.device_id}</p>

      {/* ── Location & time ────────────────────────────────────────────── */}
      {hasLocation ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <MapPin size={11} className="text-teal-400 shrink-0" />
            <span className="font-mono">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={11} className="shrink-0" />
            <span>{lastSeen}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">Waiting for first ping…</p>
      )}
    </button>
  )
}
