import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loginUser, registerUser, fetchCurrentUser } from '../api/fleetApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('fleet_token') || null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const profile = await fetchCurrentUser()
      setUser(profile)
    } catch {
      localStorage.removeItem('fleet_token')
      setToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email, password) => {
    const data = await loginUser(email, password)
    localStorage.setItem('fleet_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }

  const register = async (email, password, fullName, code, role) => {
    const data = await registerUser(email, password, fullName, code, role)
    localStorage.setItem('fleet_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('fleet_token')
    localStorage.removeItem('fleet_account_code')
    localStorage.removeItem('fleet_is_tracking')
    localStorage.removeItem('fleet_device_id')
    setToken(null)
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(userData)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
