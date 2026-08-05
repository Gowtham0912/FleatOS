import { useState, useEffect, useCallback } from 'react'
import { fetchVehicles, fetchVehicle } from '../api/fleetApi'

/**
 * useVehicles — fetches vehicles from REST API and merges live WS updates.
 *
 * @param {Object|null} wsMessage - latest message from useWebSocket
 * @returns {{ vehicles, locations, isLoading, error, refresh }}
 */
export function useVehicles(wsMessage) {
  const [vehicles, setVehicles]   = useState([])
  const [locations, setLocations] = useState({}) // { [vehicleId]: LocationObject }
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState(null)

  // ── Initial load ────────────────────────────────────────────────────────
  const loadVehicles = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const list = await fetchVehicles()
      setVehicles(list)

      // For each vehicle, fetch its latest location
      const locationMap = {}
      await Promise.all(
        list.map(async (v) => {
          try {
            const detail = await fetchVehicle(v.id)
            if (detail.latest_location) {
              locationMap[v.id] = detail.latest_location
            }
          } catch {
            // Vehicle with no location yet — skip silently
          }
        })
      )
      setLocations(locationMap)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVehicles()
  }, [loadVehicles])

  // ── Live WebSocket updates ───────────────────────────────────────────────
  useEffect(() => {
    if (!wsMessage) return

    const { vehicle_id, vehicle_name, latitude, longitude, timestamp, device_id } = wsMessage

    // Upsert vehicle in the list
    setVehicles((prev) => {
      const exists = prev.some((v) => v.id === vehicle_id)
      if (exists) return prev
      return [...prev, { id: vehicle_id, device_id, name: vehicle_name }]
    })

    // Update location map
    setLocations((prev) => ({
      ...prev,
      [vehicle_id]: { latitude, longitude, timestamp },
    }))
  }, [wsMessage])

  return {
    vehicles,
    locations,
    isLoading,
    error,
    refresh: loadVehicles,
  }
}
