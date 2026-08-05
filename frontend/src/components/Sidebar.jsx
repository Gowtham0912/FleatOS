import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Truck, Radio, Wifi, WifiOff } from 'lucide-react'

/**
 * Sidebar — fixed left navigation panel.
 */
export default function Sidebar({ isConnected, vehicleCount }) {
  const navItems = [
    { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vehicles', icon: Truck,           label: 'Vehicles'  },
  ]

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-navy-900 border-r border-navy-700 shrink-0">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-700">
        <div className="w-9 h-9 rounded-xl bg-teal-400 flex items-center justify-center shrink-0">
          <Radio size={18} className="text-navy-900" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">FleetOS</p>
          <p className="text-xs text-slate-400 mt-0.5">Live Tracking</p>
        </div>
      </div>

      {/* ── Nav items ────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-teal-400/10 text-teal-400 border border-teal-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Connection status ─────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-t border-navy-700 space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            {isConnected
              ? <Wifi size={14} className="text-teal-400" />
              : <WifiOff size={14} className="text-red-400" />
            }
            <span className="text-xs text-slate-400">
              {isConnected ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
          <span className={`status-dot ${isConnected ? 'active' : 'inactive'}`} />
        </div>

        <div className="glass-card px-3 py-2.5">
          <p className="text-xs text-slate-400">Tracked Vehicles</p>
          <p className="text-xl font-bold text-white mt-0.5">{vehicleCount}</p>
        </div>
      </div>
    </aside>
  )
}
