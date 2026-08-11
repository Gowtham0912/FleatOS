import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Navigation, X, QrCode, Copy, Check, LogOut, User as UserIcon, AlertCircle, Menu } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'

// The backend host — live Render public backend
const BACKEND_HOST = 'https://fleet-backend-5i1b.onrender.com'

/**
 * TopBar — shows page title, last update time, Connect GPS button,
 *          and user profile chip in the top right.
 */
export default function TopBar({ title, lastMessage, onToggleMobileMenu }) {
  const [showQr, setShowQr] = useState(false)
  const [showLoginNotice, setShowLoginNotice] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const { user, logout } = useAuth()

  const lastTime = lastMessage?.timestamp
    ? format(new Date(lastMessage.timestamp), 'HH:mm:ss')
    : null

  // Build the GPS URL with the user's account code
  const accountCode = user?.account_code || ''
  const GPS_URL = accountCode
    ? `${BACKEND_HOST}/gps?code=${accountCode}`
    : `${BACKEND_HOST}/gps`

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(GPS_URL)}&bgcolor=ffffff&color=0f172a&margin=10`

  const handleConnectClick = () => {
    if (!user) {
      setShowLoginNotice(true)
    } else {
      setShowQr(true)
    }
  }

  const copyCode = () => {
    if (accountCode) {
      navigator.clipboard.writeText(accountCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const copyUrl = () => {
    if (GPS_URL) {
      navigator.clipboard.writeText(GPS_URL)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }

  return (
    <>
      <header className="flex items-center justify-between px-3.5 py-2.5 md:px-6 md:py-3.5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Open Navigation"
            >
              <Menu size={20} />
            </button>
          )}

          <div>
            <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">{title}</h1>
            <p className="text-[11px] md:text-xs text-slate-500 mt-0.5">
              {lastTime
                ? `Last ping: ${lastTime}`
                : 'Waiting for GPS data…'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Activity flash on new message */}
          {lastMessage && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 animate-fade-in mr-1" key={lastMessage.timestamp}>
              <Activity size={13} />
              <span>Ping received</span>
            </div>
          )}

          {/* Connect GPS button */}
          <button
            id="connect-phone-btn"
            onClick={handleConnectClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg text-xs font-semibold
                       bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            <Navigation size={13} />
            <span className="hidden sm:inline">Connect GPS</span>
            <span className="sm:hidden">Connect</span>
          </button>

          {/* User Profile / Login (Rightmost Top Bar) */}
          <div className="pl-2 md:pl-3 border-l border-slate-200">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user.full_name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <UserIcon size={14} />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Login Required Warning Modal ─────────────────────────────────── */}
      {showLoginNotice && (
        <div
          id="login-notice-backdrop"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={(e) => e.target.id === 'login-notice-backdrop' && setShowLoginNotice(false)}
        >
          <div className="relative bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center gap-4 text-center shadow-xl max-w-sm w-full animate-fade-in">
            <button
              onClick={() => setShowLoginNotice(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sign In Required</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please log in to your account first to generate your pairing code and connect GPS devices.
              </p>
            </div>
            <Link
              to="/login"
              onClick={() => setShowLoginNotice(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors text-center"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      )}

      {/* ── QR / Account Code Modal ──────────────────────────────────────── */}
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
              <span className="text-sm font-bold tracking-tight">Connect GPS Tracker</span>
            </div>

            {/* Account Code — prominent display */}
            {accountCode && (
              <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Your Account Code</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold font-mono text-blue-700 tracking-widest">{accountCode}</p>
                  <button
                    onClick={copyCode}
                    className="p-1.5 rounded-lg bg-white border border-blue-200 text-blue-600 hover:bg-blue-100
                               transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-blue-400 mt-1.5">Share this code or scan QR below</p>
              </div>
            )}

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

            {/* URL with Copy Button */}
            <div className="text-center w-full">
              <p className="text-xs text-slate-500 mb-1.5">Or open this link on your phone:</p>
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <a
                  href={GPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-blue-600 hover:underline truncate flex-1 text-left px-1"
                  title={GPS_URL}
                >
                  {GPS_URL}
                </a>
                <button
                  onClick={copyUrl}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 text-slate-700
                             hover:bg-slate-100 text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                  title="Copy link"
                >
                  {copiedUrl ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

