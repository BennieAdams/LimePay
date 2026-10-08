import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Phone } from 'lucide-react'
import { ConnectKitButton } from 'connectkit'

interface AuthPageProps {
  mode: 'register' | 'login'
  onBack: () => void
  onSuccess: (email: string, name: string) => void
  onWalletSuccess: () => void
  onToggleMode: () => void
}

export default function AuthPage({ mode, onBack, onSuccess, onWalletSuccess, onToggleMode }: AuthPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const isRegister = mode === 'register'

  const validate = () => {
    const e: Record<string, string> = {}
    if (isRegister && !form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Valid email is required'
    if (!form.password || form.password.length < 8)
      e.password = 'Password must be at least 8 characters'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setIsLoading(false)
    onSuccess(form.email, form.name)
  }

  return (
    <div
      className="min-h-dvh relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}
    >
      {/* BG blob */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: 0, right: '-10%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.22) 0%, transparent 70%)', filter: 'blur(55px)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 md:px-10 pt-6 pb-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95 active:scale-90"
          aria-label="Go back"
        >
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <Logo />
        <div className="w-10" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 flex-1 flex flex-col justify-start px-5 md:px-0 pt-4 pb-10 md:items-center"
      >
        <div className="w-full md:max-w-md glass-card rounded-3xl p-7 md:p-10 shadow-xl shadow-green-100/60">
          {/* Spectral top strip */}
          <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full spectral-strip" />

          <h1 className="display text-2xl font-bold text-[var(--ink)] mb-1">
            {isRegister ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-[var(--muted)] mb-6">
            {isRegister
              ? 'Join LimePay and start sending money today'
              : 'Sign in to your LimePay account'}
          </p>

          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4" noValidate>
            {isRegister && (
              <Field
                label="Full Name"
                id="name"
                type="text"
                icon={<User size={16} />}
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                error={errors.name}
                placeholder="Alex Johnson"
                autoComplete="name"
              />
            )}
            <Field
              label="Email Address"
              id="email"
              type="email"
              icon={<Mail size={16} />}
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {isRegister && (
              <Field
                label="Phone Number (optional)"
                id="phone"
                type="tel"
                icon={<Phone size={16} />}
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="+1 555 000 0000"
                autoComplete="tel"
              />
            )}
            <div className="relative">
              <Field
                label="Password"
                id="password"
                type={showPassword ? 'text' : 'password'}
                icon={<Lock size={16} />}
                value={form.password}
                onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                error={errors.password}
                placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 bottom-3 text-[var(--subtle)] hover:text-[var(--muted)] transition-fast"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {!isRegister && (
              <div className="flex justify-end">
                <button type="button" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-fast hover:scale-[1.01] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-green-200"
              style={{ background: 'var(--accent)' }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {isRegister ? 'Creating account…' : 'Signing in…'}
                </span>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs text-[var(--subtle)]">or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Wallet connect */}
          <ConnectKitButton.Custom>
            {({ show, isConnected }) => (
              <button
                type="button"
                onClick={() => { if (isConnected) { onWalletSuccess() } else { show?.() } }}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-[var(--ink)] border-2 border-[var(--border)] bg-white/70 flex items-center justify-center gap-2 transition-fast hover:bg-green-50 hover:border-[var(--accent)] active:scale-95"
              >
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4ade80] to-[#16a34a]" />
                Continue with Wallet
              </button>
            )}
          </ConnectKitButton.Custom>

          <p className="mt-5 text-center text-sm text-[var(--muted)]">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="font-semibold underline"
              style={{ color: 'var(--accent)' }}
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

interface FieldProps {
  label: string
  id: string
  type: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  autoComplete?: string
}

function Field({ label, id, type, icon, value, onChange, error, placeholder, autoComplete }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[var(--ink-2)] mb-1.5">
        {label}
      </label>
      <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl glass-inner border-2 transition-fast focus-within:border-[var(--accent)] ${error ? 'border-[var(--danger)]' : 'border-transparent'}`}>
        <span style={{ color: error ? 'var(--danger)' : 'var(--subtle)' }}>{icon}</span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder-[var(--subtle)] outline-none"
        />
      </div>
      {error && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>
        <span className="text-white font-black text-xs display">L</span>
      </div>
      <span className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>
        Lime<span style={{ color: 'var(--accent)' }}>Pay</span>
      </span>
    </div>
  )
}
