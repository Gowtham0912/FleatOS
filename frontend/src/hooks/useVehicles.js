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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState(null)
  const { user } = useAuth()

  // ── Initial load ────────────────────────────────────────────────────────
  const loadVehicles = useCallback(async () => {
    if (!user) {
      setVehicles([])
      setLocations({})
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

    const { vehicle_id, latitude, longitude, timestamp } = wsMessage

    // Only merge WebSocket updates if the vehicle belongs to the logged-in user's fleet!
    setVehicles((prev) => {
      const vehicleOwned = prev.some((v) => v.id === vehicle_id)
      if (!vehicleOwned) return prev

      setLocations((locPrev) => ({
        ...locPrev,
        [vehicle_id]: { latitude, longitude, timestamp },
      }))

      return prev
    })
  }, [wsMessage, user])

  return {
    vehicles,
    locations,
    isLoading,
    error,
    refresh: loadVehicles,
  }
}
