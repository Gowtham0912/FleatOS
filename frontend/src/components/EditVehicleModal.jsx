import { useState, useEffect } from 'react'
import { X, Save, Settings, Car, Truck, Bike, Bus } from 'lucide-react'
import { updateVehicle } from '../api/fleetApi'

const ICONS = [
  { id: 'car', label: 'Car', Icon: Car },
  { id: 'truck', label: 'Truck', Icon: Truck },
  { id: 'motorcycle', label: 'Motorcycle', Icon: Bike },
  { id: 'bus', label: 'Bus', Icon: Bus },
]

export default function EditVehicleModal({ isOpen, onClose, vehicle, onVehicleUpdated }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('car')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (vehicle && isOpen) {
      setName(vehicle.name || '')
      setType(vehicle.vehicle_type || 'car')
    }
  }, [vehicle, isOpen])

  if (!isOpen || !vehicle) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setIsSubmitting(true)
    try {
      const updatedVehicle = await updateVehicle(vehicle.id, {
        name: name.trim(),
        vehicle_type: type
      })
      if (onVehicleUpdated) onVehicleUpdated(updatedVehicle)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  return (
    <div
      id="edit-vehicle-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target.id === 'edit-vehicle-backdrop' && handleClose()}
    >
      <div className="relative bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-6 shadow-xl max-w-md w-full animate-fade-in transition-colors">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
          <div className="w-8 h-8 rounded bg-brand-primary/10 dark:bg-[#17b385]/10 text-brand-primary dark:text-[#17b385] flex items-center justify-center font-bold transition-colors">
            <Settings size={18} />
          </div>
          <h2 className="text-base font-bold">Manage Vehicle</h2>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/30 rounded text-xs text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Vehicle Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Personal Car"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Vehicle Type (Icon)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ICONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setType(id)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded border transition-all cursor-pointer ${
                    type === id
                      ? 'bg-brand-primary/10 dark:bg-[#17b385]/10 border-brand-primary dark:border-[#17b385] text-brand-primary dark:text-[#17b385] shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 flex items-center justify-center gap-2 bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#14a076] text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-2"
          >
            <Save size={14} />
            {isSubmitting ? 'Saving changes…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
