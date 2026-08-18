import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navigation, Loader2, XCircle, Play, Square, AlertCircle, Smartphone } from 'lucide-react'
import { sendPairingRequest, checkPairingStatus, sendLocation } from '../api/fleetApi'
import { useAuth } from '../context/AuthContext'

const INTERVAL_MS = 1000
const POLL_MS = 3000

export default function GPSSender() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const routerLocation = useLocation()
  const [code, setCode] = useState(() => searchParams.get('code') || localStorage.getItem('fleet_account_code') || '')
  const [deviceId, setDeviceId] = useState('')
  const [status, setStatus] = useState('enter_code') // enter_code, pending, rejected, tracking
  const [isTracking, setIsTracking] = useState(() => localStorage.getItem('fleet_is_tracking') === 'true')
  const [ownerName, setOwnerName] = useState('')
  const [ownerAvatar, setOwnerAvatar] = useState(null)
  const [logs, setLogs] = useState([])
  const [location, setLocation] = useState(null)
  const [pingCount, setPingCount] = useState(0)
  const [vehicleName, setVehicleName] = useState('')
  const [error, setError] = useState(null)

  // Refs for intervals/watchers
  const watchIdRef = useRef(null)
  const intervalIdRef = useRef(null)
  const pollIdRef = useRef(null)
  const lastPosRef = useRef(null)
  const lastPostTimeRef = useRef(0)
  const wakeLockRef = useRef(null)

  // Derive a stable device ID from the logged-in user's name + ID.
  // Uses the user's full name so it's human-readable in the dashboard,
  // with the numeric ID suffix to guarantee uniqueness across users.
  // e.g. "GowthamSankar-42"
  useEffect(() => {
    if (user) {
      const safeName = (user.full_name || 'user')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')        // spaces → hyphens
        .replace(/[^a-z0-9-]/g, '')  // strip special chars
        .replace(/-+/g, '-')         // collapse multiple hyphens
        .replace(/^-|-$/g, '')       // trim leading/trailing hyphens
      const id = `${safeName || 'user'}-${user.id}`
      // Clean up any old random device ID from localStorage
      localStorage.removeItem('fleet_device_id')
      setDeviceId(id)
    }
  }, [user])

  const addLog = (type, msg) => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), type, msg, time }].slice(-20))
  }

  // Wake lock management
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener('release', () => {
          addLog('warn', 'Screen Wake Lock released')
        })
        addLog('info', 'Screen Wake Lock acquired')
      } catch (err) {
        addLog('err', `Wake Lock error: ${err.message}`)
      }
    }
  }

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null
      })
    }
  }

  // Handle visibility changes for wake lock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible' && isTracking) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
      if (pollIdRef.current) clearInterval(pollIdRef.current)
    }
  }, [])

  // Auto-submit code if it's in URL
  useEffect(() => {
    if (deviceId && status === 'enter_code') {
      if (code) {
        const urlCode = searchParams.get('code')
        if (urlCode && urlCode === code) {
          submitCode(code)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]) // run when deviceId is ready

  const startPolling = () => {
    if (pollIdRef.current) clearInterval(pollIdRef.current)
    pollIdRef.current = setInterval(checkStatus, POLL_MS)
  }

  const stopPolling = () => {
    if (pollIdRef.current) {
      clearInterval(pollIdRef.current)
      pollIdRef.current = null
    }
  }

  const checkStatus = async () => {
    try {
      const data = await checkPairingStatus(deviceId)
      if (data.status === 'approved') {
        stopPolling()
        setVehicleName(data.vehicle_name)
        setOwnerName(data.owner_name || '')
        setOwnerAvatar(data.owner_avatar_url || null)
        setStatus('tracking')
        addLog('ok', `✅ Device approved! Vehicle: ${data.vehicle_name}`)
        
        // Auto-resume tracking if we were tracking before refresh
        if (isTracking) {
          startTracking()
        }
      } else if (data.status === 'rejected') {
        stopPolling()
        setStatus('rejected')
      } else if (data.status === 'none') {
        stopPolling()
        stopTracking()
        setStatus('enter_code')
        localStorage.removeItem('fleet_account_code')
        localStorage.removeItem('fleet_is_tracking')
      }
    } catch (err) {
      // Keep polling on network error
    }
  }

  const submitCode = async (c) => {
    if (!c.trim()) {
      setError('Please enter a code.')
      return
    }
    const upperCode = c.trim().toUpperCase()

    // Block self-pairing: user cannot pair their own account to themselves
    if (user && user.account_code && upperCode === user.account_code.toUpperCase()) {
      setError('This is your own account code. Share it with someone else\'s phone — you cannot track yourself.')
      return
    }

    setError(null)
    setCode(upperCode)

    try {
      const data = await sendPairingRequest(upperCode, deviceId)
      
      // Save code for persistence
      localStorage.setItem('fleet_account_code', upperCode)
      
      if (data.status === 'approved') {
        setStatus('tracking')
        setVehicleName(data.vehicle_name || '')
        setOwnerName(data.owner_name || '')
        setOwnerAvatar(data.owner_avatar_url || null)
        addLog('ok', `✅ Device approved!`)
        startTracking()
      } else if (data.status === 'pending') {
        setStatus('pending')
        startPolling()
      } else if (data.status === 'rejected') {
        setStatus('rejected')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    submitCode(code)
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3
    const p1 = lat1 * Math.PI / 180
    const p2 = lat2 * Math.PI / 180
    const dp = (lat2 - lat1) * Math.PI / 180
    const dl = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) *
      Math.sin(dl / 2) * Math.sin(dl / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const postGPS = async (pos) => {
    lastPostTimeRef.current = Date.now()
    const { latitude, longitude, accuracy } = pos.coords
    const timestamp = new Date().toISOString()

    setLocation({ latitude, longitude, accuracy, timestamp })

    const payload = { device_id: deviceId, latitude, longitude, timestamp }
    if (code) payload.account_code = code

    try {
      await sendLocation(payload)
      setPingCount(p => {
        const newCount = p + 1
        addLog('ok', `OK — ping #${newCount} (±${Math.round(accuracy)}m)`)
        return newCount
      })
    } catch (err) {
      if (err.message.includes('not approved')) {
        addLog('err', 'Device not approved or deleted')
        stopTracking()
        stopPolling()
        setStatus('enter_code')
      } else {
        addLog('err', `Network error: ${err.message}`)
      }
    }
  }

  const handleLocationUpdate = (pos) => {
    if (lastPosRef.current) {
      const dist = calculateDistance(
        lastPosRef.current.coords.latitude, lastPosRef.current.coords.longitude,
        pos.coords.latitude, pos.coords.longitude
      )
      if (dist < 5) return // Ignore tiny movements
    }
    lastPosRef.current = pos
    const now = Date.now()
    if (now - lastPostTimeRef.current >= INTERVAL_MS) {
      postGPS(pos)
    }
  }

  const handleLocationError = (err) => {
    const msgs = {
      1: 'Permission denied — allow Location in settings',
      2: 'GPS unavailable — turn ON Location/GPS',
      3: 'GPS request timed out — retrying…'
    }
    addLog('err', msgs[err.code] || 'GPS error')
  }

  const startTracking = () => {
    if (!navigator.geolocation) {
      addLog('err', 'GPS not supported')
      return
    }

    setIsTracking(true)
    localStorage.setItem('fleet_is_tracking', 'true')
    addLog('info', 'Acquiring high-precision GPS…')

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleLocationUpdate,
      handleLocationError,
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    )

    intervalIdRef.current = setInterval(() => {
      if (lastPosRef.current) postGPS(lastPosRef.current)
    }, INTERVAL_MS)

    requestWakeLock()
  }

  const stopTracking = () => {
    setIsTracking(false)
    localStorage.setItem('fleet_is_tracking', 'false')
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
    }
    addLog('info', 'Tracking stopped.')
    releaseWakeLock()
  }

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking()
    } else {
      startTracking()
    }
  }

  if (!user) {
    const returnTo = encodeURIComponent(routerLocation.pathname + routerLocation.search)
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors"
    >
      <div className="max-w-md mx-auto w-full space-y-4">

        {status === 'enter_code' && (
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary dark:text-[#17b385] rounded flex items-center justify-center mx-auto mb-3">
                <Navigation size={24} />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Connect Device</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter the 6-digit code from your dashboard.</p>
            </div>

            <form onSubmit={handleManualSubmit}>
              <input
                type="text"
                required
                placeholder="FLT-XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-center text-lg font-mono font-bold tracking-widest uppercase bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-4 py-3 mb-4 focus:outline-none focus:border-brand-primary text-slate-900 dark:text-white transition-colors"
              />
              {error && (
                <div className="mb-4 text-xs text-rose-600 text-center bg-rose-50 border border-rose-200 p-2 rounded">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90 text-white font-bold text-sm py-3 rounded transition-colors shadow-sm cursor-pointer"
              >
                Pair Device
              </button>
            </form>
          </div>
        )}

        {status === 'pending' && (
          <div className="bg-amber-50 rounded border border-amber-200 p-6 shadow-sm text-center">
            <img src="/globe.svg" alt="Loading..." className="w-8 h-8 mx-auto mb-3 opacity-80" />
            <h2 className="text-sm font-bold text-amber-900 mb-1">Waiting for approval…</h2>
            <p className="text-xs text-amber-700">The account owner needs to approve this device.</p>
            <p className="text-[10px] text-amber-600 font-mono mt-4">Device ID: {deviceId}</p>
          </div>
        )}

        {status === 'rejected' && (
          <div className="bg-rose-50 rounded border border-rose-200 p-6 shadow-sm text-center">
            <XCircle size={32} className="text-rose-500 mx-auto mb-3" />
            <h2 className="text-sm font-bold text-rose-900 mb-1">Request Rejected</h2>
            <p className="text-xs text-rose-700 mb-4">The account owner rejected your pairing request.</p>
            <button
              onClick={() => { setStatus('enter_code'); setCode(''); localStorage.removeItem('fleet_account_code'); localStorage.removeItem('fleet_is_tracking') }}
              className="bg-white border border-rose-200 text-rose-700 font-bold text-xs py-2 px-4 rounded hover:bg-rose-50 transition-colors cursor-pointer shadow-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'tracking' && (
          <div className="space-y-4">
            <div className="bg-white rounded border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Sending to</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                      {ownerAvatar ? (
                        <img src={ownerAvatar.startsWith('http') ? ownerAvatar : `${import.meta.env.VITE_API_BASE_URL || ''}${ownerAvatar}`} alt="Owner" className="w-full h-full object-cover" />
                      ) : (
                        (ownerName || 'Fleet')[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{ownerName || 'Fleet Account'}</p>
                      <p className="text-xs text-brand-primary dark:text-[#17b385] font-semibold">{vehicleName}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status</p>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold ${isTracking ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  {isTracking ? 'Live Streaming' : 'Paused'}
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pings Sent</p>
                <p className="text-xs font-bold text-slate-700">{pingCount}</p>
              </div>

              {location ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Coordinates</p>
                    <p className="text-xs font-mono text-slate-700">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Accuracy</p>
                    <p className="text-xs font-mono text-slate-700">±{Math.round(location.accuracy)}m</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  Waiting for GPS lock...
                </div>
              )}
            </div>

            <button
              onClick={toggleTracking}
              className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded transition-colors shadow-sm text-white cursor-pointer ${isTracking ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-primary dark:bg-[#17b385] hover:bg-brand-primary/90 dark:hover:bg-[#17b385]/90'}`}
            >
              {isTracking ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isTracking ? 'Stop Sharing' : 'Start Sharing Location'}
            </button>

            <div className="bg-slate-900 rounded p-3 h-32 overflow-y-auto font-mono text-[10px] space-y-1">
              {logs.length === 0 ? (
                <p className="text-slate-500">System ready. Waiting to start...</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-slate-500 shrink-0">[{log.time}]</span>
                    <span className={`break-words ${
                      log.type === 'ok' ? 'text-emerald-400' :
                      log.type === 'err' ? 'text-rose-400' :
                      log.type === 'warn' ? 'text-amber-400' :
                      'text-slate-300'
                    }`}>
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 leading-snug text-left">
                <strong>Keep this tab open!</strong> Mobile browsers pause GPS when minimized. For background tracking, leave screen on.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
