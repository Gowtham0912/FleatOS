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
      <div className="relative bg-white rounded-xl border border-slate-200 p-6 shadow-xl max-w-md w-full animate-fade-in">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4 text-slate-900">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Settings size={18} />
          </div>
          <h2 className="text-base font-bold">Manage Vehicle</h2>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Vehicle Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Personal Car"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Vehicle Type (Icon)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ICONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setType(id)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border transition-all cursor-pointer ${
                    type === id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-500'
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
            className="w-full py-2.5 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-2"
          >
            <Save size={14} />
            {isSubmitting ? 'Saving changes…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
