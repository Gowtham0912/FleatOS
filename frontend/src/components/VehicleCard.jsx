import { Truck, MapPin, Clock, Trash2, Edit2, Car, Bike, Bus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'

/**
 * VehicleCard — a single vehicle row in the sidebar vehicle list with delete action.
 */
const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000   // 2 minutes

export default function VehicleCard({ vehicle, location, isSelected, onSelect, onEdit, onDelete }) {
  const hasLocation = !!location

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'truck': return <Truck size={13} />
      case 'motorcycle': return <Bike size={13} />
      case 'bus': return <Bus size={13} />
      case 'car':
      default: return <Car size={13} />
    }
  }

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

  const handleDelete = (e) => {
    e.stopPropagation()
    if (onDelete) onDelete(vehicle.id)
  }

  const handleEdit = (e) => {
    e.stopPropagation()
    if (onEdit) onEdit(vehicle)
  }

  return (
    <div
      onClick={() => onSelect(vehicle)}
      className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer group ${
        isSelected
          ? 'bg-blue-50/70 border-blue-500 shadow-sm'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {getVehicleIcon(vehicle.vehicle_type)}
          </div>
          <span className="text-xs font-bold text-slate-900 truncate">
            {vehicle.name}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} title={isActive ? 'Active' : 'Offline'} />
          <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={handleEdit}
                title="Edit Vehicle"
                className="text-slate-300 hover:text-blue-600 p-1 rounded transition-colors cursor-pointer"
              >
                <Edit2 size={13} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                title="Delete Vehicle"
                className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer ml-0.5"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
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
    </div>
  )
}
