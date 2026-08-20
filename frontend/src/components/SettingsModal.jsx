import { useState, useRef } from 'react'
import { Camera, X, User, CheckCircle, Shield, UserCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateProfile, changePassword, requestChangePasswordOTP } from '../api/fleetApi'
import { useAuth } from '../context/AuthContext'
import { getAvatarUrl } from '../api/fleetApi'

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8000')
).replace(/\/$/, '')

export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  
  // Profile State
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(user?.avatar_url ? getAvatarUrl(user.avatar_url) : null)
  const fileInputRef = useRef(null)

  // Security State
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [otpRequested, setOtpRequested] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  // Shared UI State
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

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

  const handleProfileSubmit = async (e) => {
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
      setSuccessMessage('Profile updated successfully!')
      
      // Auto close after brief success message
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!otpRequested) {
        // Step 1: Request OTP
        await requestChangePasswordOTP(currentPassword)
        setOtpRequested(true)
        setSuccess(true)
        setSuccessMessage('OTP sent to your email!')
        setTimeout(() => setSuccess(false), 3000)
      } else {
        // Step 2: Verify and change password
        await changePassword(currentPassword, newPassword, otpCode)
        setSuccess(true)
        setSuccessMessage('Password changed successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setOtpCode('')
        setOtpRequested(false)
        
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (err) {
      setError(err.message || (otpRequested ? 'Failed to change password.' : 'Failed to request OTP.'))
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
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden transition-colors border border-transparent dark:border-slate-800"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 transition-colors">
          <h2 className="font-bold text-slate-900 dark:text-white text-base">Account Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-2 pt-2 gap-2 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => { setActiveTab('profile'); setError(null); setSuccess(false) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'profile' 
                ? 'text-brand-primary dark:text-[#17b385] border-b-2 border-brand-primary dark:border-[#17b385]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserCircle size={16} /> Profile
          </button>
          <button
            onClick={() => { setActiveTab('security'); setError(null); setSuccess(false); setIsChangingPassword(false) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'security' 
                ? 'text-brand-primary dark:text-[#17b385] border-b-2 border-brand-primary dark:border-[#17b385]' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Shield size={16} /> Security
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSubmit}>
              {/* Avatar Upload */}
              <div className="flex flex-col items-center mb-6">
                <div 
                  className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer group overflow-hidden transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-slate-400 dark:text-slate-500" />
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Click to change photo</p>
              </div>

              {/* Name Input */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    setSuccess(false)
                    setError(null)
                  }}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:ring-1 focus:ring-brand-primary/50 dark:focus:ring-[#17b385]/50 transition-colors"
                />
              </div>
              
              {error && <p className="text-xs text-rose-600 dark:text-rose-400 mb-4">{error}</p>}
              
              <AnimatePresence>
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-transparent dark:border-emerald-900/30 p-2 rounded"
                  >
                    <CheckCircle size={14} />
                    {successMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading || (!avatarFile && fullName === user?.full_name)}
                className="w-full bg-brand-primary dark:bg-[#17b385] hover:bg-brand-secondary dark:hover:bg-[#14a076] text-white font-semibold text-sm py-2.5 rounded transition-colors disabled:opacity-50 flex justify-center cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Save Profile'
                )}
              </button>
            </form>
          ) : !isChangingPassword ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Shield size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Password & Security</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
                Update your password to keep your account secure. You will need to verify this action with an OTP sent to your email.
              </p>
              <button
                type="button"
                onClick={() => setIsChangingPassword(true)}
                className="w-full bg-brand-primary dark:bg-[#17b385] hover:bg-brand-secondary dark:hover:bg-[#14a076] text-white font-semibold text-sm py-2.5 rounded transition-colors cursor-pointer"
              >
                Change Password
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Password</h3>
                <button 
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setError(null);
                    setSuccess(false);
                    setCurrentPassword('');
                    setNewPassword('');
                  }} 
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  disabled={otpRequested}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setSuccess(false)
                    setError(null)
                  }}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:ring-1 focus:ring-brand-primary/50 dark:focus:ring-[#17b385]/50 transition-colors disabled:opacity-50"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  disabled={otpRequested}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setSuccess(false)
                    setError(null)
                  }}
                  required
                  minLength={6}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:ring-1 focus:ring-brand-primary/50 dark:focus:ring-[#17b385]/50 transition-colors disabled:opacity-50"
                />
              </div>

              {otpRequested && (
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Verification Code (OTP)</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value)
                      setSuccess(false)
                      setError(null)
                    }}
                    required
                    maxLength={6}
                    placeholder="123456"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-primary dark:focus:border-[#17b385] focus:ring-1 focus:ring-brand-primary/50 dark:focus:ring-[#17b385]/50 transition-colors text-center tracking-widest font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Please enter the 6-digit code sent to your email.</p>
                </div>
              )}
              
              {error && <p className="text-xs text-rose-600 dark:text-rose-400 mb-4">{error}</p>}
              
              <AnimatePresence>
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-transparent dark:border-emerald-900/30 p-2 rounded"
                  >
                    <CheckCircle size={14} />
                    {successMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading || !currentPassword || newPassword.length < 6 || (otpRequested && otpCode.length < 6)}
                className="w-full bg-brand-primary dark:bg-[#17b385] hover:bg-brand-secondary dark:hover:bg-[#14a076] text-white font-semibold text-sm py-2.5 rounded transition-colors disabled:opacity-50 flex justify-center cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : otpRequested ? (
                  'Verify & Change Password'
                ) : (
                  'Request OTP'
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
