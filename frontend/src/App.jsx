import { useState } from 'react'
import { Routes, Route, useLocation, Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import PairingRequests from './pages/PairingRequests'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ShareView from './pages/ShareView'
import GPSSender from './pages/GPSSender'
import { useWebSocket } from './hooks/useWebSocket'
import { useVehicles } from './hooks/useVehicles'
import { useAuth } from './context/AuthContext'

/**
 * App — root component with full authentication & route configuration.
 */
export default function App() {
  const { isLoading: authLoading } = useAuth()
  const { lastMessage, isConnected } = useWebSocket()
  const { vehicles, locations, locationHistory, isLoading, error, refresh } = useVehicles(lastMessage)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999]">
        <img src="/globe.svg" alt="Loading..." className="w-16 h-16 mb-6 opacity-80" />
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">FleetOS</h1>
        <p className="text-sm font-medium text-slate-500">Starting engine...</p>
      </div>
    )
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const location = useLocation()

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/vehicles')) return 'Vehicles & Devices'
    if (pathname.startsWith('/requests')) return 'Pairing Requests'
    if (pathname.startsWith('/gps')) return 'GPS Sender'
    return 'Live Map'
  }

  return (
    <Routes>
      {/* Public Share View */}
      <Route path="/share/:shareCode" element={<ShareView />} />

      {/* Auth Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Main Dashboard Layout */}
      <Route
        path="/*"
        element={
          <div className="flex fixed inset-0 overflow-hidden bg-white text-slate-800">
            <Sidebar
              isConnected={isConnected}
              vehicleCount={vehicles.length}
              isOpen={isMobileMenuOpen}
              onClose={closeMobileMenu}
            />

            <main className="flex flex-col flex-1 min-w-0 min-h-0">
              {error && (
                <div className="px-4 md:px-6 py-2 bg-rose-100 border-b border-rose-200 text-rose-700 text-xs font-medium">
                  ⚠ {error}
                </div>
              )}

              <TopBar
                title={getPageTitle(location.pathname)}
                isConnected={isConnected}
                lastMessage={lastMessage}
                onVehicleAdded={refresh}
                onToggleMobileMenu={toggleMobileMenu}
              />

              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route
                    index
                    element={
                      <Dashboard
                        vehicles={vehicles}
                        locations={locations}
                        locationHistory={locationHistory}
                        isLoading={isLoading}
                        lastMessage={lastMessage}
                        isConnected={isConnected}
                        onRefresh={refresh}
                        onToggleMobileMenu={toggleMobileMenu}
                      />
                    }
                  />
                  <Route
                    path="vehicles"
                    element={
                      <Vehicles
                        vehicles={vehicles}
                        locations={locations}
                        isLoading={isLoading}
                        isConnected={isConnected}
                        lastMessage={lastMessage}
                        onToggleMobileMenu={toggleMobileMenu}
                      />
                    }
                  />
                  <Route
                    path="requests"
                    element={
                      <PairingRequests
                        isConnected={isConnected}
                        lastMessage={lastMessage}
                        onRefresh={refresh}
                        onToggleMobileMenu={toggleMobileMenu}
                      />
                    }
                  />
                  <Route
                    path="gps"
                    element={<GPSSender />}
                  />
                </Routes>
              </AnimatePresence>
            </main>
          </div>
        }
      />
    </Routes>
  )
}


