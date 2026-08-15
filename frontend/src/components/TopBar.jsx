import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Navigation, X, QrCode, Copy, Check, LogOut, User as UserIcon, AlertCircle, Menu, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import SettingsModal from './SettingsModal'

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8000')
).replace(/\/$/, '')

// The backend host — live Render public backend
// Removed BACKEND_HOST since URLs should now point to frontend

/**
 * TopBar — shows page title, last update time, Connect GPS button,
 *          and user profile chip in the top right.
 */
export default function TopBar({ title, lastMessage, onToggleMobileMenu }) {
  const [showQr, setShowQr] = useState(false)
  const [showLoginNotice, setShowLoginNotice] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { user, logout } = useAuth()

  const lastTime = lastMessage?.timestamp
    ? format(new Date(lastMessage.timestamp), 'HH:mm:ss')
    : null

  // Build the GPS URL with the user's account code to point to the frontend `/gps` route
  const accountCode = user?.account_code || ''
  const GPS_URL = accountCode
    ? `${window.location.origin}/gps?code=${accountCode}`
    : `${window.location.origin}/gps`

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
              className="md:hidden p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded text-xs font-semibold
                       bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <Navigation size={13} />
            <span className="hidden sm:inline">Connect GPS</span>
            <span className="sm:hidden">Connect</span>
          </button>

          {/* User Profile / Login (Rightmost Top Bar) */}
          <div className="pl-2 md:pl-3 border-l border-slate-200 relative">
            {user ? (
              <>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1 -m-1 rounded hover:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <img src={`${BASE_URL}${user.avatar_url}`} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.full_name ? user.full_name[0].toUpperCase() : 'U'
                    )}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user.full_name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{user.email}</p>
                  </div>
                </button>

                {showProfileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded border border-slate-200 shadow-lg z-50 py-1 animate-fade-in">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          setShowSettings(true)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                      >
                        <Settings size={15} />
                        <span className="font-medium">Account Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          setShowLogoutConfirm(true)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-slate-50 transition-colors text-left"
                      >
                        <LogOut size={15} />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors"
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
          <div className="relative bg-white rounded border border-slate-200 p-6 flex flex-col items-center gap-4 text-center shadow-xl max-w-sm w-full animate-fade-in">
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
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs rounded shadow-sm transition-colors text-center"
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
            className="relative bg-white rounded border border-slate-200 p-6 flex flex-col items-center gap-4 shadow-xl max-w-sm w-full animate-fade-in"
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
              <QrCode size={20} className="text-brand-primary" />
              <span className="text-sm font-bold tracking-tight">Connect GPS Tracker</span>
            </div>

            {/* Account Code — prominent display */}
            {accountCode && (
              <div className="w-full bg-brand-primary/10 border border-brand-primary/30 rounded p-4 text-center">
                <p className="text-[10px] text-brand-primary/80 font-bold uppercase tracking-wider mb-1">Your Account Code</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold font-mono text-brand-primary tracking-widest">{accountCode}</p>
                  <button
                    onClick={copyCode}
                    className="p-1.5 rounded bg-white border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20
                               transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-brand-primary/60 mt-1.5">Share this code or scan QR below</p>
              </div>
            )}

            {/* QR Code */}
            <div
              className="rounded overflow-hidden border border-slate-200 bg-white p-2 shadow-inner"
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
              <div className="flex items-center gap-1.5 bg-white p-1.5 rounded border border-slate-200">
                <a
                  href={GPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-brand-primary hover:underline truncate flex-1 text-left px-1"
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

      {/* ── Logout Confirmation Modal ────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div
          id="logout-confirm-backdrop"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 animate-fade-in"
          onClick={(e) => e.target.id === 'logout-confirm-backdrop' && setShowLogoutConfirm(false)}
        >
          <div className="bg-white border border-slate-200 p-6 flex flex-col items-center gap-4 text-center shadow-xl rounded-xl max-w-xs w-full animate-slide-in">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <LogOut size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sign Out</h3>
              <p className="text-xs text-slate-500 mt-1">Are you sure you want to sign out of your account?</p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false)
                  logout()
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ─────────────────────────────────────────────── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}

