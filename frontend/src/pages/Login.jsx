import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requestOtpLogin, verifyOtpLogin } from '../api/fleetApi'
import OTPInput from '../components/OTPInput'
import { motion } from 'framer-motion'

export default function Login() {
  const [mode, setMode] = useState('password') // 'password' or 'otp'
  const [otpStep, setOtpStep] = useState(1) // 1: request, 2: verify
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    try {
      await requestOtpLogin(email)
      setSuccess('If this email is registered, an OTP has been sent.')
      setOtpStep(2)
    } catch (err) {
      setError(err.message || 'Failed to request OTP')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const data = await verifyOtpLogin(email, code)
      localStorage.setItem('fleet_token', data.access_token)
      window.location.href = '/'
    } catch (err) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'password' ? 'otp' : 'password')
    setOtpStep(1)
    setError(null)
    setSuccess(null)
    setCode('')
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen w-screen bg-white flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded shadow-sm max-w-md w-full p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 mb-2">
            <img src="/logo.png" alt="Fleet OS" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Sign in to Fleet Tracker</h1>
          <p className="text-xs text-slate-500 mt-1">Manage your private vehicles and live GPS tracking</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
        
        {success && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-brand-accent/10 border border-brand-accent/30 rounded flex items-center gap-2 text-xs text-brand-accent">
            <CheckCircle size={14} className="shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}

        {/* Password Mode */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-[10px] text-brand-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded pl-9 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* OTP Mode */}
        {mode === 'otp' && otpStep === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary transition-colors"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Sending Code…' : 'Send Login Code'}
            </button>
          </form>
        )}

        {mode === 'otp' && otpStep === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center text-sm font-medium text-slate-700 mb-4">
              Enter the 6-digit code sent to<br/> <span className="font-bold text-slate-900">{email}</span>
            </div>
            
            <OTPInput value={code} onChange={setCode} />
            
            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 mt-4"
            >
              {isSubmitting ? 'Verifying…' : 'Verify & Sign In'}
            </button>
          </form>
        )}

        {/* Toggle Mode */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 items-center text-xs">
          <button
            type="button"
            onClick={toggleMode}
            className="text-slate-600 font-medium hover:text-slate-900 transition-colors"
          >
            {mode === 'password' ? 'Sign in with a one-time code instead' : 'Sign in with a password instead'}
          </button>
        </div>

        <div className="mt-2 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-primary font-semibold hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
