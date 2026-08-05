import { Truck, MapPin, Clock, Hash, Smartphone } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import TopBar from '../components/TopBar'

/**
 * Vehicles page — table view of all tracked devices.
 */
export default function Vehicles({ vehicles, locations, isLoading, isConnected, lastMessage }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        title="Vehicles"
        isConnected={isConnected}
        lastMessage={lastMessage}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-500">
            <p>Loading vehicles…</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center">
            <Truck size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No vehicles tracked yet</p>
            <p className="text-xs mt-1">Start the Android app to register your phone as a vehicle.</p>
          </div>
        ) : (
          <>
            {/* ── Stats bar ──────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Vehicles', value: vehicles.length, icon: Truck },
                { label: 'With Location', value: Object.keys(locations).length, icon: MapPin },
                { label: 'Active (5 min)', value: Object.values(locations).filter(l =>
                    Date.now() - new Date(l.timestamp).getTime() < 5 * 60 * 1000
                  ).length, icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className="text-teal-400" />
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* ── Table ──────────────────────────────────────────────── */}
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    {['#', 'Name', 'Device ID', 'Coordinates', 'Last Seen', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {vehicles.map((v) => {
                    const loc = locations[v.id]
                    const isActive = loc && Date.now() - new Date(loc.timestamp).getTime() < 5 * 60 * 1000

                    return (
                      <tr key={v.id} className="hover:bg-navy-800/50 transition-colors">
                        {/* ID */}
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.id}</td>

                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Truck size={13} className="text-teal-400 shrink-0" />
                            <span className="font-medium text-white">{v.name}</span>
                          </div>
                        </td>

                        {/* Device ID */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Smartphone size={12} className="text-slate-500 shrink-0" />
                            <span className="font-mono text-xs text-slate-300">{v.device_id}</span>
                          </div>
                        </td>

                        {/* Coordinates */}
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">
                          {loc
                            ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
                            : <span className="text-slate-600 italic">No data</span>}
                        </td>

                        {/* Last Seen */}
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {loc
                            ? formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true })
                            : '—'}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isActive
                              ? 'bg-teal-400/10 text-teal-400 border border-teal-400/20'
                              : loc
                              ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                              : 'bg-slate-700/50 text-slate-400 border border-slate-700'
                          }`}>
                            <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} style={{ width: 6, height: 6 }} />
                            {isActive ? 'Active' : loc ? 'Idle' : 'No Signal'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
