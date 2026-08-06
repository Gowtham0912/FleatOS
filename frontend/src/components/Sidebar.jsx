import { NavLink, Link } from 'react-router-dom'
import { LayoutDashboard, Truck, Navigation, Wifi, WifiOff, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Sidebar — simple clean left navigation panel with user profile.
 */
export default function Sidebar({ isConnected, vehicleCount }) {
  const { user, logout } = useAuth()

  const navItems = [
    { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vehicles', icon: Truck,           label: 'Vehicles'  },
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
        {navItems.map(({ to, icon: Icon, label }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── User Profile & Status ─────────────────────────────────────────── */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        {/* User account chip */}
        {user ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 rounded-lg text-xs font-semibold transition-colors"
          >
            <UserIcon size={14} />
            <span>Sign In / Register</span>
          </Link>
        )}

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
