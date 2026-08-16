import { useState, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Map, List, Smartphone } from 'lucide-react'
import FleetMap from '../components/FleetMap'
import VehicleList from '../components/VehicleList'
import TopBar from '../components/TopBar' // Unused, keeping import just in case, but let's remove it
import EditVehicleModal from '../components/EditVehicleModal'
import DeleteVehicleModal from '../components/DeleteVehicleModal'
import { deleteVehicle, deleteUnlinkedVehicles } from '../api/fleetApi'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

/**
 * Dashboard page — simple clean live-tracking view with mobile tabs.
 */
export default function Dashboard({ vehicles, locations, locationHistory, isLoading, lastMessage, isConnected, onRefresh, onToggleMobileMenu }) {
  const routerLocation = useLocation()
  const navigate = useNavigate()
  
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  
  // Set selected vehicle if passed via navigation state
  useEffect(() => {
    if (routerLocation.state?.selectedVehicleId && vehicles.length > 0) {
      const v = vehicles.find(v => v.id === routerLocation.state.selectedVehicleId)
      if (v && (!selectedVehicle || selectedVehicle.id !== v.id)) {
        setSelectedVehicle(v)
        // Clear state so it doesn't re-trigger on refresh
        navigate(routerLocation.pathname, { replace: true, state: {} })
      }
    }
  }, [routerLocation.state, vehicles, navigate, routerLocation.pathname, selectedVehicle])

  const [editingVehicle, setEditingVehicle] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deletingVehicle, setDeletingVehicle] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('map') // 'map' | 'list'
  
  const { user } = useAuth()
  const [ownerLocation, setOwnerLocation] = useState(null)

  useEffect(() => {
    if (navigator.geolocation && user) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setOwnerLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          })
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      )
      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [user])

  // Interpolated positions from AnimatedMarker for live coordinate display
  const [interpolatedPositions, setInterpolatedPositions] = useState({})

  const handleInterpolatedPositions = useCallback((positions) => {
    setInterpolatedPositions(positions)
  }, [])

  const handleSelect = (vehicle) => {
    setSelectedVehicle((prev) => prev?.id === vehicle.id ? null : vehicle)
    // Switch to map view on mobile when vehicle selected
    setActiveTab('map')
  }

  const handleConfirmDelete = async (vehicleId) => {
    try {
      await deleteVehicle(vehicleId)
      if (selectedVehicle?.id === vehicleId) setSelectedVehicle(null)
      if (onRefresh) onRefresh()
    } catch (err) {
      alert('Failed to delete vehicle: ' + err.message)
      throw err // So the modal keeps the loading state if we want to handle it
    }
  }

  const handleClearUnlinked = async () => {
    try {
      await deleteUnlinkedVehicles()
      if (onRefresh) onRefresh()
    } catch (err) {
      alert('Failed to clear unlinked devices: ' + err.message)
    }
  }

  // Use interpolated position if available, otherwise fall back to raw GPS
  const getDisplayCoords = (vehicleId) => {
    const interp = interpolatedPositions[vehicleId]
    if (interp) return interp
    const loc = locations[vehicleId]
    if (loc) return { latitude: loc.latitude, longitude: loc.longitude }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-950 transition-colors"
    >


      {/* ── Mobile View Toggle Pill (visible only on < md screens) ────────────── */}
      <div className="md:hidden flex items-center justify-center p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 transition-colors">
        <div className="flex items-center bg-white dark:bg-slate-950 p-1 rounded border border-slate-200 dark:border-slate-800 w-full max-w-xs shadow-sm transition-colors">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'map'
                ? 'bg-brand-primary dark:bg-[#17b385] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <Map size={14} />
            <span>Map View</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'list'
                ? 'bg-brand-primary dark:bg-[#17b385] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <List size={14} />
            <span>Devices ({vehicles.length})</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* ── Map ──────────────────────────────────────────────────────── */}
        <div className={`flex-1 relative ${activeTab === 'map' ? 'block' : 'hidden md:block'}`}>
          <FleetMap
            vehicles={vehicles}
            locations={locations}
            locationHistory={locationHistory}
            selectedVehicle={selectedVehicle}
            lastWsMessage={lastMessage}
            onInterpolatedPositions={handleInterpolatedPositions}
            ownerLocation={ownerLocation}
            ownerUser={user}
          />

          {/* Overlay: no vehicles hint */}
          {!isLoading && vehicles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 z-10">
              <div className="bg-white/70 backdrop-blur-md border border-white/50 shadow-xl rounded-xl px-8 py-6 text-center max-w-sm pointer-events-auto flex flex-col items-center">
                <div className="w-12 h-12 bg-[#17b385] text-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Smartphone size={24} />
                </div>
                <p className="text-base font-bold text-slate-900 mb-1.5">No devices active</p>
                <p className="text-sm text-slate-700">
                  Click <button onClick={() => document.getElementById('connect-phone-btn')?.click()} className="text-brand-primary font-bold hover:underline cursor-pointer">Connect GPS</button> above to start tracking.
                </p>
              </div>
            </div>
          )}

          {/* Selected vehicle info overlay (bottom-left) — shows live interpolated coords */}
          {selectedVehicle && locations[selectedVehicle.id] && (() => {
            const coords = getDisplayCoords(selectedVehicle.id)
            return coords ? (
              <div className="absolute bottom-4 left-4 z-10 bg-white border border-slate-200 shadow-md rounded px-3.5 py-2.5 max-w-[240px] animate-slide-in">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
                  </span>
                  <p className="text-[10px] text-brand-accent font-bold uppercase tracking-wider">Live Tracking</p>
                </div>
                <p className="text-xs md:text-sm font-bold text-slate-900 truncate">{selectedVehicle.name}</p>
                <p className="text-[11px] md:text-xs font-mono text-slate-600 mt-0.5">
                  {coords.latitude.toFixed(6)},{' '}
                  {coords.longitude.toFixed(6)}
                </p>
              </div>
            ) : null
          })()}
        </div>

        {/* ── Vehicle list panel ────────────────────────────────────────── */}
        <div className={`w-full md:w-56 shrink-0 h-full ${activeTab === 'list' ? 'block' : 'hidden md:block'}`}>
          <VehicleList
            vehicles={vehicles}
            locations={locations}
            selectedVehicle={selectedVehicle}
            onSelect={handleSelect}
            onEdit={(v) => {
              setEditingVehicle(v)
              setIsEditModalOpen(true)
            }}
            onDelete={(v) => {
              setDeletingVehicle(v)
              setIsDeleteModalOpen(true)
            }}
            onClearUnlinked={handleClearUnlinked}
            onRefresh={onRefresh}
            isLoading={isLoading}
          />
        </div>
      </div>

      <EditVehicleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingVehicle(null)
        }}
        vehicle={editingVehicle}
        onVehicleUpdated={onRefresh}
      />

      <DeleteVehicleModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeletingVehicle(null)
        }}
        vehicle={deletingVehicle}
        onConfirm={handleConfirmDelete}
      />
    </motion.div>
  )
}

