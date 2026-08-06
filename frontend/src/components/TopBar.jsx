import { useState } from 'react'
import { Wifi, WifiOff, Activity, Smartphone, X, QrCode, Plus } from 'lucide-react'
import { format } from 'date-fns'
import AddVehicleModal from './AddVehicleModal'
import { useAuth } from '../context/AuthContext'

// The backend host — live Render public backend
const BACKEND_HOST = 'https://fleet-backend-5i1b.onrender.com'
const GPS_URL = `${BACKEND_HOST}/gps`

/**
 * TopBar — shows page title, last update time, WS connection status,
 *          and buttons to add vehicles and connect phones via QR code.
 */
export default function TopBar({ title, isConnected, lastMessage, onVehicleAdded }) {
  const [showQr, setShowQr] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const { user } = useAuth()

  const lastTime = lastMessage?.timestamp
    ? format(new Date(lastMessage.timestamp), 'HH:mm:ss')
    : null

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(GPS_URL)}&bgcolor=ffffff&color=0f172a&margin=10`

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-base font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lastTime
              ? `Last ping: ${lastTime}`
              : 'Waiting for GPS data…'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Activity flash on new message */}
          {lastMessage && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 animate-fade-in mr-1" key={lastMessage.timestamp}>
              <Activity size={13} />
              <span>Ping received</span>
            </div>
          )}

          {/* Add Vehicle Button (for logged in users) */}
          {user && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              Add Vehicle
            </button>
          )}

          {/* Connect Phone button */}
          <button
            id="connect-phone-btn"
            onClick={() => setShowQr(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            <Smartphone size={13} />
            Connect Phone
          </button>

          {/* WS Status chip */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {isConnected
              ? <><Wifi size={13} /> Connected</>
              : <><WifiOff size={13} /> Offline</>
            }
          </div>
        </div>
      </header>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onVehicleAdded={onVehicleAdded}
      />

      {/* ── QR Modal ──────────────────────────────────────────────────── */}
      {showQr && (
        <div
          id="qr-modal-backdrop"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={(e) => e.target.id === 'qr-modal-backdrop' && setShowQr(false)}
        >
          <div
            className="relative bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center gap-4 shadow-xl max-w-sm w-full animate-fade-in"
          >
            {/* Close button */}
            <button
              id="qr-close-btn"
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 text-slate-900">
              <QrCode size={20} className="text-blue-600" />
              <span className="text-sm font-bold tracking-tight">Connect Phone Tracker</span>
            </div>

            {/* QR Code */}
            <div
              className="rounded-lg overflow-hidden border border-slate-200 bg-white p-2 shadow-inner"
            >
              <img
                src={qrSrc}
                alt="GPS Sender QR Code"
                width={200}
                height={200}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div style={{ display: 'none' }} className="w-[200px] h-[200px] items-center justify-center text-xs text-slate-500 text-center p-4">
                Type URL manually into your phone
              </div>
            </div>

            {/* URL */}
            <div className="text-center w-full">
              <p className="text-xs text-slate-500 mb-1">Or open this link on your phone:</p>
              <a
                href={GPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-blue-600 hover:underline break-all bg-slate-50 px-2 py-1 rounded border border-slate-200 block"
              >
                {GPS_URL}
              </a>
            </div>

            {/* Steps */}
            <ol className="text-xs text-slate-600 space-y-1.5 self-start w-full border-t border-slate-100 pt-3">
              <li><strong className="text-slate-900">1.</strong> Scan QR code with your phone camera</li>
              <li><strong className="text-slate-900">2.</strong> Tap <strong className="text-slate-900">Start Tracking</strong> and grant location permission</li>
              <li><strong className="text-slate-900">3.</strong> Device will appear on dashboard map!</li>
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
