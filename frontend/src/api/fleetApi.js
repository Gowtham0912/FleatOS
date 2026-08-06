/**
 * Fleet API client — REST endpoints wrapper with token authentication.
 */

const BASE_URL = '/api'

function getAuthHeaders() {
  const token = localStorage.getItem('fleet_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Register a new user account.
 */
export async function registerUser(email, password, fullName) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Registration failed')
  }
  return res.json()
}

/**
 * Log in an existing user.
 */
export async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Login failed')
  }
  return res.json()
}

/**
 * Get current user profile.
 */
export async function fetchCurrentUser() {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Session expired')
  return res.json()
}

/**
 * Fetch tracked vehicles.
 */
export async function fetchVehicles() {
  const res = await fetch(`${BASE_URL}/vehicles`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error(`GET /vehicles failed: ${res.status}`)
  return res.json()
}

/**
 * Create a new vehicle.
 */
export async function createVehicle(name) {
  const res = await fetch(`${BASE_URL}/vehicles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to create vehicle')
  }
  return res.json()
}

/**
 * Fetch a shared vehicle by public share code.
 */
export async function fetchSharedVehicle(shareCode) {
  const res = await fetch(`${BASE_URL}/vehicles/share/${shareCode}`)
  if (!res.ok) throw new Error('Shared tracking link not found')
  return res.json()
}

/**
 * Fetch a single vehicle with its latest location.
 */
export async function fetchVehicle(vehicleId) {
  const res = await fetch(`${BASE_URL}/vehicles/${vehicleId}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error(`GET /vehicles/${vehicleId} failed: ${res.status}`)
  return res.json()
}

/**
 * Fetch the last N location records for a vehicle.
 */
export async function fetchVehicleHistory(vehicleId, limit = 50) {
  const res = await fetch(`${BASE_URL}/vehicles/${vehicleId}/history?limit=${limit}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error(`GET /vehicles/${vehicleId}/history failed: ${res.status}`)
  return res.json()
}

/**
 * Delete a specific vehicle.
 */
export async function deleteVehicle(vehicleId) {
  const res = await fetch(`${BASE_URL}/vehicles/${vehicleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete vehicle')
  return res.json()
}

/**
 * Delete all unlinked legacy vehicles.
 */
export async function deleteUnlinkedVehicles() {
  const res = await fetch(`${BASE_URL}/vehicles/unlinked`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete unlinked vehicles')
  return res.json()
}

/**
 * Health check.
 */
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`)
  if (!res.ok) throw new Error('Health check failed')
  return res.json()
}
