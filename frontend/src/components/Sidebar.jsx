import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Truck, Navigation, Wifi, WifiOff, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchPairingRequests } from '../api/fleetApi'

/**
 * Sidebar — simple clean left navigation panel with device status.
 */
export default function Sidebar({ isConnected, vehicleCount }) {
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

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white border-r border-slate-200 shrink-0">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <Navigation size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-none">Fleet Tracker</p>
          <p className="text-xs text-slate-500 mt-1">GPS Control Panel</p>
        </div>
      </div>

      {/* ── Nav items ────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
      <div className="p-4 border-t border-slate-200 space-y-3">
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
    </aside>
  )
}

