import { Truck, MapPin, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'

/**
 * VehicleCard — a single vehicle row in the sidebar vehicle list.
 */
const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000   // 2 minutes

export default function VehicleCard({ vehicle, location, isSelected, onSelect }) {
  const hasLocation = !!location

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
    : 'No location yet'

  return (
    <button
      onClick={() => onSelect(vehicle)}
      className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-blue-50/70 border-blue-500 shadow-sm'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${
            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            <Truck size={13} />
          </div>
          <span className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
            {vehicle.name}
          </span>
        </div>
        <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} title={isActive ? 'Active' : 'Offline'} />
      </div>

      {/* ── Device ID ──────────────────────────────────────────────────── */}
      <p className="text-[11px] text-slate-400 font-mono truncate mb-2">{vehicle.device_id}</p>

      {/* ── Location & time ────────────────────────────────────────────── */}
      {hasLocation ? (
        <div className="space-y-1 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
            <MapPin size={11} className="text-blue-600 shrink-0" />
            <span className="font-mono">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Clock size={10} className="shrink-0" />
            <span>{lastSeen}</span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic">Waiting for location…</p>
      )}
    </button>
  )
}
