/**
 * Fleet API client — REST endpoints wrapper with token authentication.
 */

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'https://fleet-backend-5i1b.onrender.com')
).replace(/\/$/, '')

function getAuthHeaders() {
  const token = localStorage.getItem('fleet_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Request an OTP for registration.
 */
export async function requestRegisterOtp(email) {
  const res = await fetch(`${BASE_URL}/auth/register/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to request registration OTP')
  }
  return res.json()
}

/**
 * Register a new user account.
 */
export async function registerUser(email, password, fullName, code) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName, code }),
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
 * Update an existing vehicle's name and type.
 */
export async function updateVehicle(vehicleId, updates) {
  const res = await fetch(`${BASE_URL}/vehicles/${vehicleId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to update vehicle')
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


// ── Pairing Request API ────────────────────────────────────────────────────

/**
 * Fetch pairing requests for current user.
 * @param {string|null} statusFilter - optional filter: 'pending', 'approved', 'rejected'
 */
export async function fetchPairingRequests(statusFilter = null) {
  const url = statusFilter
    ? `${BASE_URL}/pairing/requests?status_filter=${statusFilter}`
    : `${BASE_URL}/pairing/requests`
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch pairing requests')
  return res.json()
}

/**
 * Approve a pairing request with a vehicle name.
 */
export async function approvePairingRequest(requestId, vehicleName) {
  const res = await fetch(`${BASE_URL}/pairing/requests/${requestId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ vehicle_name: vehicleName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to approve request')
  }
  return res.json()
}

/**
 * Reject a pairing request.
 */
export async function rejectPairingRequest(requestId) {
  const res = await fetch(`${BASE_URL}/pairing/requests/${requestId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to reject request')
  }
  return res.json()
}

// ── OTP & Password Reset API ───────────────────────────────────────────────

export async function requestPasswordReset(email) {
  const res = await fetch(`${BASE_URL}/auth/forgot-password/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to request password reset')
  }
  return res.json()
}

export async function resetPassword(email, code, newPassword) {
  const res = await fetch(`${BASE_URL}/auth/forgot-password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, new_password: newPassword }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to reset password')
  }
  return res.json()
}

export async function requestOtpLogin(email) {
  const res = await fetch(`${BASE_URL}/auth/login/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to request OTP login')
  }
  return res.json()
}

export async function verifyOtpLogin(email, code) {
  const res = await fetch(`${BASE_URL}/auth/login/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to verify login OTP')
  }
  return res.json()
}
