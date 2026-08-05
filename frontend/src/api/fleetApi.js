/**
 * Fleet API client — thin wrappers around fetch() for REST endpoints.
 * WebSocket is handled separately in useWebSocket.js
 */

const BASE_URL = '/api'   // Vite proxies /api → http://localhost:8000

/**
 * Fetch all tracked vehicles.
 * @returns {Promise<Array>}
 */
export async function fetchVehicles() {
  const res = await fetch(`${BASE_URL}/vehicles`)
  if (!res.ok) throw new Error(`GET /vehicles failed: ${res.status}`)
  return res.json()
}

/**
 * Fetch a single vehicle with its latest location.
 * @param {number} vehicleId
 * @returns {Promise<Object>}
 */
export async function fetchVehicle(vehicleId) {
  const res = await fetch(`${BASE_URL}/vehicles/${vehicleId}`)
  if (!res.ok) throw new Error(`GET /vehicles/${vehicleId} failed: ${res.status}`)
  return res.json()
}

/**
 * Fetch the last N location records for a vehicle.
 * @param {number} vehicleId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function fetchVehicleHistory(vehicleId, limit = 50) {
  const res = await fetch(`${BASE_URL}/vehicles/${vehicleId}/history?limit=${limit}`)
  if (!res.ok) throw new Error(`GET /vehicles/${vehicleId}/history failed: ${res.status}`)
  return res.json()
}

/**
 * Health check.
 * @returns {Promise<{status: string}>}
 */
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`)
  if (!res.ok) throw new Error('Health check failed')
  return res.json()
}
