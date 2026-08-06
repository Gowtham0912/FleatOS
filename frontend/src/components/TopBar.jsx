import { useState } from 'react'
import { Wifi, WifiOff, Activity, Smartphone, X, QrCode } from 'lucide-react'
import { format } from 'date-fns'

// The backend host — phone must open this on the same WiFi
const BACKEND_HOST = 'http://192.168.31.205:8000'
const GPS_URL = `${BACKEND_HOST}/gps`

/**
 * TopBar — shows page title, last update time, WS connection status,
 *          and a "Connect Phone" button that displays a scan-to-track QR code.
 */
export default function TopBar({ title, isConnected, lastMessage }) {
  const [showQr, setShowQr] = useState(false)

  const lastTime = lastMessage?.timestamp
    ? format(new Date(lastMessage.timestamp), 'HH:mm:ss')
    : null

  // QR image via free Google Charts API (no install needed)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(GPS_URL)}&bgcolor=1e293b&color=64ffda&margin=10`

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3.5 bg-navy-900 border-b border-navy-700 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-white">{title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {lastTime
              ? `Last update: ${lastTime}`
              : 'Waiting for GPS data…'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Activity flash on new message */}
          {lastMessage && (
            <div className="flex items-center gap-1.5 text-xs text-teal-400 animate-fade-in" key={lastMessage.timestamp}>
              <Activity size={13} />
              <span>New ping received</span>
            </div>
          )}

          {/* Connect Phone button */}
          <button
            id="connect-phone-btn"
            onClick={() => setShowQr(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                       bg-teal-400/10 border-teal-400/30 text-teal-400 hover:bg-teal-400/20 hover:border-teal-400/60 cursor-pointer"
          >
            <Smartphone size={12} />
            Connect Phone
          </button>

          {/* WS Status chip */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            isConnected
              ? 'bg-teal-400/10 border-teal-400/20 text-teal-400'
              : 'bg-red-400/10 border-red-400/20 text-red-400'
          }`}>
            {isConnected
              ? <><Wifi size={12} /> Live</>
              : <><WifiOff size={12} /> Offline</>
            }
          </div>
        </div>
      </header>

      {/* ── QR Modal ──────────────────────────────────────────────────── */}
      {showQr && (
        <div
          id="qr-modal-backdrop"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => e.target.id === 'qr-modal-backdrop' && setShowQr(false)}
        >
          <div
            className="relative rounded-2xl border border-slate-700 p-7 flex flex-col items-center gap-5 shadow-2xl animate-fade-in"
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              minWidth: 300,
            }}
          >
            {/* Close button */}
            <button
              id="qr-close-btn"
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 text-teal-400">
              <QrCode size={20} />
              <span className="text-sm font-bold tracking-wide uppercase">Scan to Track</span>
            </div>

            {/* QR Code */}
            <div
              className="rounded-xl overflow-hidden border border-teal-400/20 shadow-lg shadow-teal-400/10"
              style={{ padding: 4, background: '#1e293b' }}
            >
              <img
                src={qrSrc}
                alt="GPS Sender QR Code"
                width={220}
                height={220}
                onError={(e) => {
                  // Fallback if QR API unavailable
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              {/* Fallback text */}
              <div style={{ display: 'none' }} className="w-[220px] h-[220px] items-center justify-center text-xs text-slate-400 text-center p-4">
                QR unavailable — type the URL manually
              </div>
            </div>

            {/* URL */}
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Open this on your phone's browser</p>
              <a
                href={GPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-teal-400 hover:text-teal-300 transition-colors break-all"
              >
                {GPS_URL}
              </a>
            </div>

            {/* Steps */}
            <ol className="text-xs text-slate-400 space-y-1.5 self-start w-full border-t border-slate-700 pt-4">
              <li><span className="text-teal-400 font-bold">1.</span> Make sure your phone is on the <strong className="text-white">same WiFi</strong></li>
              <li><span className="text-teal-400 font-bold">2.</span> Scan the QR code with your camera</li>
              <li><span className="text-teal-400 font-bold">3.</span> Tap <strong className="text-white">Start Tracking</strong> and allow location</li>
              <li><span className="text-teal-400 font-bold">4.</span> Watch your phone appear on the map! 🎉</li>
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
