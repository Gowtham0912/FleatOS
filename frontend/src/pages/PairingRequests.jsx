import { useState, useEffect, useCallback } from 'react'
import { Smartphone, Check, X, Clock, Shield, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { fetchPairingRequests, approvePairingRequest, rejectPairingRequest } from '../api/fleetApi'
import { motion } from 'framer-motion'

/**
 * PairingRequests page — shows pending device pairing requests
 * that the account owner can approve or reject.
 */
export default function PairingRequests({ isConnected, lastMessage, onRefresh, onToggleMobileMenu }) {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [approveId, setApproveId] = useState(null)
  const [vehicleName, setVehicleName] = useState('')
  const [processing, setProcessing] = useState(null)

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchPairingRequests()
      setRequests(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
    // Poll every 10 seconds for new requests
    const interval = setInterval(loadRequests, 10000)
    return () => clearInterval(interval)
  }, [loadRequests])

  const handleApprove = async (requestId) => {
    if (!vehicleName.trim()) return
    setProcessing(requestId)
    try {
      await approvePairingRequest(requestId, vehicleName.trim())
      setApproveId(null)
      setVehicleName('')
      await loadRequests()
      if (onRefresh) onRefresh()
    } catch (err) {
      alert('Failed to approve: ' + err.message)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (requestId) => {
    setProcessing(requestId)
    try {
      await rejectPairingRequest(requestId)
      await loadRequests()
    } catch (err) {
      alert('Failed to reject: ' + err.message)
    } finally {
      setProcessing(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const pastRequests = requests.filter(r => r.status !== 'pending')

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-slate-950 transition-colors"
    >


      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-brand-primary/10 dark:bg-[#17b385]/10 text-brand-primary dark:text-[#17b385] flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight">Device Pairing Requests</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Approve or reject devices requesting to connect to your account</p>
            </div>
          </div>
          <button
            onClick={loadRequests}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold
                       bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
            ⚠ {error}
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock size={13} />
              Pending Approval ({pendingRequests.length})
            </h3>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded p-4 shadow-sm animate-fade-in transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 flex items-center justify-center shrink-0">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{req.sender_name || 'New Device'}</p>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">{req.device_id}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          Requested {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {approveId === req.id ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          placeholder="Vehicle name (e.g. My Car)"
                          value={vehicleName}
                          onChange={(e) => setVehicleName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleApprove(req.id)}
                          autoFocus
                          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100
                                     placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] flex-1 sm:w-44 transition-colors"
                        />
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={!vehicleName.trim() || processing === req.id}
                          className="p-1.5 rounded bg-brand-accent text-white hover:bg-brand-accent/90
                                     disabled:opacity-50 cursor-pointer transition-colors shrink-0"
                          title="Confirm approve"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => { setApproveId(null); setVehicleName('') }}
                          className="p-1.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700
                                     cursor-pointer transition-colors shrink-0"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setApproveId(req.id); setVehicleName(req.sender_name || '') }}
                          disabled={processing === req.id}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold
                                     bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors
                                     disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          <Check size={13} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={processing === req.id}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold
                                     bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors
                                     disabled:opacity-50 cursor-pointer"
                        >
                          <X size={13} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && pendingRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm mb-8 transition-colors">
            <div className="w-12 h-12 rounded bg-brand-accent/10 dark:bg-[#17b385]/10 text-brand-accent dark:text-[#17b385] flex items-center justify-center mb-3">
              <Check size={24} />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">No pending requests</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              When someone enters your account code on the GPS Sender page, their request will appear here.
            </p>
          </div>
        )}

        {/* Past Requests */}
        {pastRequests.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              History ({pastRequests.length})
            </h3>
            <div className="space-y-2">
              {pastRequests.map((req) => (
                <div
                  key={req.id}
                  className={`bg-white dark:bg-slate-900 border rounded p-3 shadow-sm flex items-center justify-between transition-colors ${
                    req.status === 'approved'
                      ? 'border-brand-accent/30 dark:border-[#17b385]/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Smartphone size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{req.sender_name || req.device_id}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    req.status === 'approved'
                      ? 'bg-brand-accent/10 dark:bg-[#17b385]/10 text-brand-accent dark:text-[#17b385] border border-brand-accent/30 dark:border-[#17b385]/30'
                      : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30'
                  }`}>
                    {req.status === 'approved' ? <Check size={10} /> : <X size={10} />}
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
