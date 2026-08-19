import { useState, useEffect, useCallback } from 'react'
import { fetchVehicles, fetchVehicle } from '../api/fleetApi'
import { useAuth } from '../context/AuthContext'

/**
 * useVehicles — fetches vehicles for the logged-in user and merges live WS updates.
 *
 * @param {Object|null} wsMessage - latest message from useWebSocket
 * @returns {{ vehicles, locations, isLoading, error, refresh }}
 */
export function useVehicles(wsMessage) {
  const [vehicles, setVehicles]   = useState([])
  const [locations, setLocations] = useState({})
  const [locationHistory, setLocationHistory] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState(null)
  const { user } = useAuth()

  // ── Initial load ────────────────────────────────────────────────────────
  const loadVehicles = useCallback(async () => {
    if (!user) {
      setVehicles([])
      setLocations({})
      setLocationHistory({})
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const list = await fetchVehicles()
      setVehicles(list)

      const locationMap = {}
      await Promise.all(
        list.map(async (v) => {
          try {
            const detail = await fetchVehicle(v.id)
            if (detail.latest_location) {
              locationMap[v.id] = detail.latest_location
            }
          } catch {
            // Skip vehicles with no location records yet
          }
        })
      )
      setLocations(locationMap)
      
      // Initialize history with the latest location as the first point
      const historyMap = {}
      for (const [vId, loc] of Object.entries(locationMap)) {
        historyMap[vId] = [loc]
      }
      setLocationHistory(historyMap)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadVehicles()
  }, [loadVehicles])

  // ── Live WebSocket updates ───────────────────────────────────────────────
  useEffect(() => {
    if (!wsMessage || !user) return

    if (wsMessage.event === 'device_offline') {
      const { vehicle_id } = wsMessage
      setVehicles((prev) => {
        const vehicleIndex = prev.findIndex((v) => v.id === vehicle_id)
        if (vehicleIndex === -1) return prev
        const updated = [...prev]
        updated[vehicleIndex] = { ...updated[vehicleIndex], active_session_id: null }
        return updated
      })
      setLocations((locPrev) => {
        if (!locPrev[vehicle_id]) return locPrev
        return {
          ...locPrev,
          [vehicle_id]: {
            ...locPrev[vehicle_id],
            // Set timestamp to 3 minutes ago so it's considered offline immediately
            timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
          },
        }
      })
      return
    }

    const { vehicle_id, latitude, longitude, timestamp } = wsMessage

    // Only merge WebSocket updates if the vehicle belongs to the logged-in user's fleet!
    setVehicles((prev) => {
      const vehicleIndex = prev.findIndex((v) => v.id === vehicle_id)
      if (vehicleIndex === -1) return prev

      // Update name/type if changed
      const updated = [...prev]
      if (wsMessage.vehicle_name && updated[vehicleIndex].name !== wsMessage.vehicle_name) {
        updated[vehicleIndex].name = wsMessage.vehicle_name
      }
      if (wsMessage.vehicle_type && updated[vehicleIndex].vehicle_type !== wsMessage.vehicle_type) {
        updated[vehicleIndex].vehicle_type = wsMessage.vehicle_type
      }
      if (wsMessage.active_session_id !== undefined && updated[vehicleIndex].active_session_id !== wsMessage.active_session_id) {
        updated[vehicleIndex].active_session_id = wsMessage.active_session_id
      }

      setLocations((locPrev) => ({
        ...locPrev,
        [vehicle_id]: { ...locPrev[vehicle_id], ...wsMessage },
      }))

      setLocationHistory((histPrev) => {
        const existing = histPrev[vehicle_id] || []
        // Keep last 60 points (1 minute of history at 1 ping/sec)
        const updatedHistory = [...existing, wsMessage].slice(-60)
        return {
          ...histPrev,
          [vehicle_id]: updatedHistory
        }
      })

      return updated
    })
  }, [wsMessage, user])

  return {
    vehicles,
    locations,
    locationHistory,
    isLoading,
    error,
    refresh: loadVehicles,
  }
}
