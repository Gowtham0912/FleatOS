import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import { useWebSocket } from './hooks/useWebSocket'
import { useVehicles } from './hooks/useVehicles'

/**
 * App — root component.
 *
 * Manages shared state:
 *   - WebSocket connection (live updates)
 *   - Vehicles + locations (REST + WS merge)
 *
 * Layout: [Sidebar] | [Page content]
 */
export default function App() {
  const { lastMessage, isConnected } = useWebSocket()
  const { vehicles, locations, isLoading, error, refresh } = useVehicles(lastMessage)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <Sidebar
        isConnected={isConnected}
        vehicleCount={vehicles.length}
      />

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex flex-col flex-1 min-w-0 min-h-0">
        {error && (
          <div className="px-6 py-2 bg-red-900/40 border-b border-red-800/50 text-red-300 text-xs">
            ⚠ Backend error: {error} — Make sure the FastAPI server is running on port 8000.
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                vehicles={vehicles}
                locations={locations}
                isLoading={isLoading}
                lastMessage={lastMessage}
                isConnected={isConnected}
                onRefresh={refresh}
              />
            }
          />
          <Route
            path="/vehicles"
            element={
              <Vehicles
                vehicles={vehicles}
                locations={locations}
                isLoading={isLoading}
                isConnected={isConnected}
                lastMessage={lastMessage}
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}
