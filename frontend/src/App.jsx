import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import PairingRequests from './pages/PairingRequests'
import Login from './pages/Login'
import Register from './pages/Register'
import ShareView from './pages/ShareView'
import { useWebSocket } from './hooks/useWebSocket'
import { useVehicles } from './hooks/useVehicles'

/**
 * App — root component with full authentication & route configuration.
 */
export default function App() {
  const { lastMessage, isConnected } = useWebSocket()
  const { vehicles, locations, isLoading, error, refresh } = useVehicles(lastMessage)

  return (
    <Routes>
      {/* Public Share View */}
      <Route path="/share/:shareCode" element={<ShareView />} />

      {/* Auth Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Main Dashboard Layout */}
      <Route
        path="*"
        element={
          <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
            <Sidebar
              isConnected={isConnected}
              vehicleCount={vehicles.length}
            />

            <main className="flex flex-col flex-1 min-w-0 min-h-0">
              {error && (
                <div className="px-6 py-2 bg-rose-100 border-b border-rose-200 text-rose-700 text-xs font-medium">
                  ⚠ {error}
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
                <Route
                  path="/requests"
                  element={
                    <PairingRequests
                      isConnected={isConnected}
                      lastMessage={lastMessage}
                      onRefresh={refresh}
                    />
                  }
                />
              </Routes>
            </main>
          </div>
        }
      />
    </Routes>
  )
}

