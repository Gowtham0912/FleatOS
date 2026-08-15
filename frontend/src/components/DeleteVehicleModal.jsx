import { useState } from 'react'
import { AlertTriangle, X, Trash2 } from 'lucide-react'

export default function DeleteVehicleModal({ isOpen, onClose, vehicle, onConfirm }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !vehicle) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(vehicle.id)
      onClose()
    } catch (err) {
      // Error handling is managed by the parent, but we stop the spinner
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <div
      id="delete-vehicle-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target.id === 'delete-vehicle-backdrop' && handleClose()}
    >
      <div className="relative bg-white rounded border border-slate-200 p-6 shadow-xl max-w-sm w-full animate-fade-in">
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4 text-slate-900">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold">Delete Vehicle</h2>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-6">
          Are you sure you want to delete <span className="font-bold text-slate-900">{vehicle.name}</span>? All associated tracking data will be lost.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 size={14} />
            {isSubmitting ? 'Deleting...' : 'Delete Vehicle'}
          </button>
        </div>
      </div>
    </div>
  )
}
