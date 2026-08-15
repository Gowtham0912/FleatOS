import { useState, useRef } from 'react'
import { Camera, X, User, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateProfile } from '../api/fleetApi'
import { useAuth } from '../context/AuthContext'

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8000')
).replace(/\/$/, '')

export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(user?.avatar_url ? `${BASE_URL}${user.avatar_url}` : null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.')
        return
      }
      setAvatarFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError(null)
      setSuccess(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('full_name', fullName)
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      const updatedUser = await updateProfile(formData)
      updateUser(updatedUser)
      setSuccess(true)
      
      // Auto close after brief success message
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-base">Account Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center mb-6">
            <div 
              className="relative w-24 h-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer group overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-slate-400" />
              )}
              
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            <p className="text-xs text-slate-500 mt-2 font-medium">Click to change photo</p>
          </div>

          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                setSuccess(false)
                setError(null)
              }}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 transition-colors"
            />
          </div>
          
          {error && <p className="text-xs text-rose-600 mb-4">{error}</p>}
          
          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 text-emerald-600 text-xs font-semibold flex items-center gap-1.5 bg-emerald-50 p-2 rounded"
              >
                <CheckCircle size={14} />
                Profile updated successfully!
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading || (!avatarFile && fullName === user?.full_name)}
            className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-semibold text-sm py-2.5 rounded transition-colors disabled:opacity-50 flex justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Save Changes'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
