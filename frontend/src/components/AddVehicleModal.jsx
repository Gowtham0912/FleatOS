import { useState } from 'react'
import { X, Plus, QrCode, Copy, Check, Share2, Smartphone } from 'lucide-react'
import { createVehicle } from '../api/fleetApi'

const BACKEND_HOST = 'https://fleet-backend-5i1b.onrender.com'

export default function AddVehicleModal({ isOpen, onClose, onVehicleAdded }) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [createdVehicle, setCreatedVehicle] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setIsSubmitting(true)
    try {
      const vehicle = await createVehicle(name.trim())
      setCreatedVehicle(vehicle)
      if (onVehicleAdded) onVehicleAdded(vehicle)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setCreatedVehicle(null)
    setError(null)
    onClose()
  }

  const gpsUrl = createdVehicle
    ? `${BACKEND_HOST}/gps?code=${createdVehicle.pairing_code}`
    : ''

  const shareUrl = createdVehicle
    ? `${window.location.origin}/share/${createdVehicle.share_code}`
    : ''

  const qrSrc = createdVehicle
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(gpsUrl)}&bgcolor=ffffff&color=0f172a&margin=10`
    : ''

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
    if (type === 'code') {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } else {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  return (
    <div
      id="add-vehicle-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target.id === 'add-vehicle-backdrop' && handleClose()}
    >
      <div className="relative bg-white rounded-xl border border-slate-200 p-6 shadow-xl max-w-md w-full animate-fade-in">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {!createdVehicle ? (
          <>
            <div className="flex items-center gap-2 mb-4 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Plus size={18} />
              </div>
              <h2 className="text-base font-bold">Add Personalized Vehicle</h2>
            </div>

            {error && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle / Device Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Personal Car, Delivery Van #1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Creating vehicle…' : 'Generate Private Pairing Code & QR'}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{createdVehicle.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Private pairing code generated</p>
            </div>

            {/* QR Code */}
            <div className="rounded-lg overflow-hidden border border-slate-200 bg-white p-2 shadow-inner">
              <img src={qrSrc} alt="Private QR Code" width={180} height={180} />
            </div>

            {/* Pairing Code badge */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Pairing Code</p>
                <p className="text-sm font-mono font-bold text-blue-600">{createdVehicle.pairing_code}</p>
              </div>
              <button
                onClick={() => copyToClipboard(createdVehicle.pairing_code, 'code')}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs"
              >
                {copiedCode ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Share Link */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
              <div className="text-left truncate max-w-[240px]">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Public Share Link</p>
                <p className="text-xs font-mono text-slate-700 truncate">{shareUrl}</p>
              </div>
              <button
                onClick={() => copyToClipboard(shareUrl, 'link')}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs"
              >
                {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Share2 size={12} />}
                <span>{copiedLink ? 'Copied' : 'Share'}</span>
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Done & View on Map
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
