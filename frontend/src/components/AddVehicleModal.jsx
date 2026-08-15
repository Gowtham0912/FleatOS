import { useState } from 'react'
import { X, Plus, QrCode, Copy, Check, Share2, Smartphone } from 'lucide-react'
import { createVehicle } from '../api/fleetApi'



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
    ? `${window.location.origin}/gps?code=${createdVehicle.pairing_code}`
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
      <div className="relative bg-white rounded border border-slate-200 p-6 shadow-xl max-w-md w-full animate-fade-in">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {!createdVehicle ? (
          <>
            <div className="flex items-center gap-2 mb-4 text-slate-900">
              <div className="w-8 h-8 rounded bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
                <Plus size={18} />
              </div>
              <h2 className="text-base font-bold">Add Personalized Vehicle</h2>
            </div>

            {error && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
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
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
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
              <p className="text-xs text-slate-500 mt-0.5">Scan QR code on mobile to start tracking</p>
            </div>

            {/* QR Code */}
            <div className="rounded overflow-hidden border border-slate-200 bg-white p-2 shadow-inner">
              <img src={qrSrc} alt="Private QR Code" width={180} height={180} />
            </div>

            {/* Mobile Tracker Link */}
            <div className="w-full bg-white border border-slate-200 rounded p-3 flex items-center justify-between">
              <div className="text-left truncate max-w-[240px]">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Mobile Tracker Link</p>
                <p className="text-xs font-mono text-slate-700 truncate">{gpsUrl}</p>
              </div>
              <button
                onClick={() => copyToClipboard(gpsUrl, 'code')}
                className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/90 bg-brand-primary/10 px-2.5 py-1 rounded border border-brand-primary/30 shadow-2xs cursor-pointer font-semibold"
              >
                {copiedCode ? <Check size={12} className="text-emerald-600" /> : <Smartphone size={12} />}
                <span>{copiedCode ? 'Copied' : 'Copy Tracker'}</span>
              </button>
            </div>

            {/* Share Map View Link */}
            <div className="w-full bg-white border border-slate-200 rounded p-3 flex items-center justify-between">
              <div className="text-left truncate max-w-[240px]">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Live Map View Link</p>
                <p className="text-xs font-mono text-slate-700 truncate">{shareUrl}</p>
              </div>
              <button
                onClick={() => copyToClipboard(shareUrl, 'link')}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs cursor-pointer font-semibold"
              >
                {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Share2 size={12} />}
                <span>{copiedLink ? 'Copied' : 'Share Map'}</span>
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded transition-colors cursor-pointer"
            >
              Done & View on Map
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
