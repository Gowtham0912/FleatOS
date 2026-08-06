import { Truck, MapPin, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'

/**
 * VehicleCard — a single vehicle row in the sidebar vehicle list.
 *
 * A vehicle is considered "active" only if its last GPS ping arrived
 * within the past 2 minutes. Anything older is shown as "inactive".
 * The status dot re-evaluates every 30 s automatically.
 */
const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000   // 2 minutes

export default function VehicleCard({ vehicle, location, isSelected, onSelect }) {
  const hasLocation = !!location

  // Tick every 30 s so the status-dot goes grey automatically after 2 min of silence
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const isActive = hasLocation
    ? Date.now() - new Date(location.timestamp).getTime() < ACTIVE_THRESHOLD_MS
    : false

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
        <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} />
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
