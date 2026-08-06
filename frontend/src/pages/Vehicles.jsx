import { Truck, MapPin, Clock, Smartphone } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import TopBar from '../components/TopBar'

/**
 * Vehicles page — simple clean table view of all tracked devices.
 */
export default function Vehicles({ vehicles, locations, isLoading, isConnected, lastMessage }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
      <TopBar
        title="Vehicles & Devices"
        isConnected={isConnected}
        lastMessage={lastMessage}
      />

      <div className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <p className="text-sm">Loading vehicles list…</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <Truck size={36} className="mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No vehicles registered</p>
            <p className="text-xs text-slate-400 mt-1">Connect your mobile phone using the QR code to start tracking.</p>
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
                <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={14} className="text-blue-600" />
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            {/* ── Table ──────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['#', 'Name', 'Device ID', 'Coordinates', 'Last Seen', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((v) => {
                    const loc = locations[v.id]
                    const isActive = loc && Date.now() - new Date(loc.timestamp).getTime() < 5 * 60 * 1000

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* ID */}
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{v.id}</td>

                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-blue-600 shrink-0" />
                            <span className="font-semibold text-slate-900">{v.name}</span>
                          </div>
                        </td>

                        {/* Device ID */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Smartphone size={12} className="text-slate-400 shrink-0" />
                            <span className="font-mono text-xs text-slate-600">{v.device_id}</span>
                          </div>
                        </td>

                        {/* Coordinates */}
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {loc
                            ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
                            : <span className="text-slate-400 italic">No data</span>}
                        </td>

                        {/* Last Seen */}
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {loc
                            ? formatDistanceToNow(new Date(loc.timestamp), { addSuffix: true })
                            : '—'}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : loc
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
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
