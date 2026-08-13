import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Truck, Navigation, Wifi, WifiOff, Shield, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchPairingRequests } from '../api/fleetApi'

/**
 * Sidebar — simple clean left navigation panel with mobile drawer support and device status.
 */
export default function Sidebar({ isConnected, vehicleCount, isOpen, onClose }) {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  // Poll for pending pairing requests
  useEffect(() => {
    if (!user) { setPendingCount(0); return }

    const load = async () => {
      try {
        const requests = await fetchPairingRequests('pending')
        setPendingCount(requests.length)
      } catch { /* ignore */ }
    }

    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [user])

  const navItems = [
    { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vehicles',   icon: Truck,           label: 'Vehicles'  },
    { to: '/requests',   icon: Shield,          label: 'Requests', badge: pendingCount },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 md:w-60">
      {/* ── Logo & Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="Fleet OS" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">Fleet Tracker</p>
            <p className="text-xs text-slate-500 mt-1">GPS Control Panel</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Nav items ────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full
                             bg-amber-500 text-white text-[10px] font-bold animate-pulse">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Status Footer ────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-slate-200 space-y-3 shrink-0">
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-2">
            {isConnected
              ? <Wifi size={14} className="text-emerald-600" />
              : <WifiOff size={14} className="text-rose-500" />
            }
            <span className="text-xs font-medium text-slate-600">
              {isConnected ? 'Server Online' : 'Connecting…'}
            </span>
          </div>
          <span className={`status-dot ${isConnected ? 'active' : 'inactive'}`} />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <p className="text-[11px] text-slate-500 font-medium">Tracked Devices</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">{vehicleCount}</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex shrink-0 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={onClose}
          />
          <aside className="relative z-10 flex flex-col h-full max-w-xs w-full shadow-2xl animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}


