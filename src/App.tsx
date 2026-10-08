import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Shield, Bell, Globe, Info, ChevronRight, ArrowLeft,
  User, Lock, Smartphone, Mail, Monitor, LogOut, Check,
  Wifi, WifiOff, Edit2, X, AtSign, Hash,
} from 'lucide-react'
import { registerUser, lookupByEmail, type RegistryEntry } from './user-registry'

import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import TermsPage from './components/TermsPage'
import KYCPage from './components/KYCPage'
import Dashboard from './components/Dashboard'
import SendReceivePage from './components/SendReceivePage'
import SwapPage from './components/SwapPage'
import TransactionHistory from './components/TransactionHistory'
import EarnPage from './components/EarnPage'
import BorrowPage from './components/BorrowPage'
import CardPayPage from './components/CardPayPage'
import BridgePage from './components/BridgePage'
import BillsPage from './components/BillsPage'
import AboutPage from './components/AboutPage'
import TopNav from './components/TopNav'
import BottomNav from './components/BottomNav'

export type Page =
  | 'landing' | 'register' | 'login' | 'terms' | 'kyc'
  | 'dashboard' | 'send' | 'receive' | 'swap' | 'history'
  | 'add' | 'earn' | 'borrow' | 'card' | 'bridge' | 'bills'
  | 'settings' | 'about'

type OnboardState = 'landing' | 'auth' | 'terms' | 'kyc' | 'app'

const APP_PAGES: Page[] = [
  'dashboard', 'send', 'receive', 'swap', 'history',
  'add', 'earn', 'borrow', 'card', 'bridge', 'bills', 'settings', 'about',
]

// ─── Session persistence ──────────────────────────────────────────────────────
const SESSION_KEY = 'limepay_session_v2'

interface Session {
  displayName: string
  email: string
  verified: boolean
  notifEmail: boolean
  notifPush: boolean
  notifTx: boolean
  notifMarketing: boolean
  username: string
  accountNumber: string
}

const DEFAULT_SESSION: Omit<Session, 'displayName' | 'email' | 'verified' | 'username' | 'accountNumber'> = {
  notifEmail: true,
  notifPush: true,
  notifTx: true,
  notifMarketing: false,
}

function entryToSessionPatch(entry: RegistryEntry): Pick<Session, 'username' | 'accountNumber'> {
  return { username: entry.username, accountNumber: entry.accountNumber }
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch { return null }
}

function saveSession(s: Session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* noop */ }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* noop */ }
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [onboard, setOnboard] = useState<OnboardState>(() => {
    const s = loadSession()
    if (s?.verified) {
      // Backfill username/accountNumber for sessions created before this feature
      if (!s.username || !s.accountNumber) {
        const entry = registerUser({
          displayName: s.displayName,
          email: s.email,
          existingAccountNumber: s.accountNumber || undefined,
          existingUsername: s.username || undefined,
        })
        const patched: Session = { ...s, ...entryToSessionPatch(entry) }
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(patched)) } catch { /* noop */ }
      }
      return 'app'
    }
    return 'landing'
  })
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register')
  const [pendingEmail, setPendingEmail] = useState('')
  const [pendingName, setPendingName] = useState('')
  const [session, setSessionState] = useState<Session | null>(() => {
    // Always reload after the possible backfill in onboard init above
    return loadSession()
  })
  const [activePage, setActivePage] = useState<Page>('dashboard')

  const displayName = session?.displayName ?? ''

  // Persist session changes
  useEffect(() => {
    if (session) saveSession(session)
  }, [session])

  const patchSession = (patch: Partial<Session>) => {
    setSessionState((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      saveSession(next)
      return next
    })
  }

  const navigate = (page: Page) => {
    if (page === 'landing') { setOnboard('landing'); return }
    if (page === 'register') { setAuthMode('register'); setOnboard('auth'); return }
    if (page === 'login') { setAuthMode('login'); setOnboard('auth'); return }
    if (APP_PAGES.includes(page)) setActivePage(page)
  }

  // Auth form success
  const handleAuthSuccess = (email: string, name: string) => {
    // On login: if we have a verified session, skip KYC
    const existing = loadSession()
    if (authMode === 'login' && existing?.verified) {
      const resolvedName = existing.displayName || name
      // Refresh registry data in case it was updated
      const regEntry = lookupByEmail(existing.email || email)
      const patch = regEntry ? entryToSessionPatch(regEntry) : {}
      setSessionState({ ...existing, displayName: resolvedName, ...patch })
      setOnboard('app')
      setActivePage('dashboard')
      return
    }
    // New registration → terms → KYC
    setPendingEmail(email)
    setPendingName(name)
    setOnboard('terms')
  }

  // Wallet connect bypass: if already verified, go straight to app
  const handleWalletAuthSuccess = () => {
    const existing = loadSession()
    if (existing?.verified) {
      setSessionState(existing)
      setOnboard('app')
      setActivePage('dashboard')
      return
    }
    // First-time wallet connect → still need terms + KYC
    setPendingEmail('')
    setPendingName('')
    setOnboard('terms')
  }

  // KYC complete — register user and save session
  const handleKYCComplete = (finalName: string) => {
    const name = finalName || pendingName || 'User'
    // Register in local directory (generates username + account number)
    const entry = registerUser({ displayName: name, email: pendingEmail })
    const newSession: Session = {
      displayName: name,
      email: pendingEmail,
      verified: true,
      ...DEFAULT_SESSION,
      ...entryToSessionPatch(entry),
    }
    setSessionState(newSession)
    saveSession(newSession)
    setOnboard('app')
    setActivePage('dashboard')
  }

  const handleLogout = () => {
    clearSession()
    setSessionState(null)
    setOnboard('landing')
    setActivePage('dashboard')
    setPendingEmail('')
    setPendingName('')
  }

  const slide = {
    initial: (d: number) => ({ x: d * 32, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d * -32, opacity: 0 }),
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      <AnimatePresence mode="wait" custom={1}>

        {onboard === 'landing' && (
          <motion.div key="landing" custom={-1} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28, ease: 'easeInOut' }}>
            <LandingPage
              onRegister={() => { setAuthMode('register'); setOnboard('auth') }}
              onLogin={() => { setAuthMode('login'); setOnboard('auth') }}
            />
          </motion.div>
        )}

        {onboard === 'auth' && (
          <motion.div key="auth" custom={1} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28, ease: 'easeInOut' }}>
            <AuthPage
              mode={authMode}
              onBack={() => setOnboard('landing')}
              onSuccess={handleAuthSuccess}
              onWalletSuccess={handleWalletAuthSuccess}
              onToggleMode={() => setAuthMode((m) => (m === 'register' ? 'login' : 'register'))}
            />
          </motion.div>
        )}

        {onboard === 'terms' && (
          <motion.div key="terms" custom={1} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28, ease: 'easeInOut' }}>
            <TermsPage onBack={() => setOnboard('auth')} onAccept={() => setOnboard('kyc')} />
          </motion.div>
        )}

        {onboard === 'kyc' && (
          <motion.div key="kyc" custom={1} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28, ease: 'easeInOut' }}>
            <KYCPage
              prefillName={pendingName}
              onBack={() => setOnboard('terms')}
              onComplete={handleKYCComplete}
            />
          </motion.div>
        )}

        {onboard === 'app' && (
          <motion.div key="app" custom={1} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28, ease: 'easeInOut' }} className="min-h-dvh flex flex-col">
            <TopNav activePage={activePage} navigate={navigate} onLogout={handleLogout} />

            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
              <AnimatePresence mode="wait">
                {activePage === 'dashboard' && <PT key="dashboard"><Dashboard navigate={navigate} displayName={displayName} /></PT>}
                {(activePage === 'send' || activePage === 'add') && <PT key="send"><SendReceivePage navigate={navigate} initialTab="send" accountNumber={session?.accountNumber} username={session?.username} /></PT>}
                {activePage === 'receive' && <PT key="receive"><SendReceivePage navigate={navigate} initialTab="receive" accountNumber={session?.accountNumber} username={session?.username} /></PT>}
                {activePage === 'swap' && <PT key="swap"><SwapPage navigate={navigate} /></PT>}
                {activePage === 'history' && <PT key="history"><TransactionHistory navigate={navigate} /></PT>}
                {activePage === 'earn' && <PT key="earn"><EarnPage navigate={navigate} /></PT>}
                {activePage === 'borrow' && <PT key="borrow"><BorrowPage navigate={navigate} /></PT>}
                {activePage === 'card' && <PT key="card"><CardPayPage navigate={navigate} /></PT>}
                {activePage === 'bridge' && <PT key="bridge"><BridgePage navigate={navigate} /></PT>}
                {activePage === 'bills' && <PT key="bills"><BillsPage navigate={navigate} /></PT>}
                {activePage === 'about' && <PT key="about"><AboutPage navigate={navigate} /></PT>}
                {activePage === 'settings' && (
                  <PT key="settings">
                    <SettingsPage
                      session={session}
                      onPatch={patchSession}
                      onLogout={handleLogout}
                      navigate={navigate}
                    />
                  </PT>
                )}
              </AnimatePresence>
            </main>

            <BottomNav activePage={activePage} navigate={navigate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PT({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="h-full">
      {children}
    </motion.div>
  )
}

// ─── Settings page ────────────────────────────────────────────────────────────
type SettingsPanel = 'main' | 'security' | 'notifications' | 'network'

function SettingsPage({ session, onPatch, onLogout, navigate }: {
  session: Session | null
  onPatch: (p: Partial<Session>) => void
  onLogout: () => void
  navigate: (page: Page) => void
}) {
  const [panel, setPanel] = useState<SettingsPanel>('main')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(session?.displayName ?? '')

  const saveName = () => {
    if (nameInput.trim()) onPatch({ displayName: nameInput.trim() })
    setEditingName(false)
  }

  if (panel === 'security') return <SecurityPanel onBack={() => setPanel('main')} />
  if (panel === 'notifications') return (
    <NotificationsPanel
      notifEmail={session?.notifEmail ?? true}
      notifPush={session?.notifPush ?? true}
      notifTx={session?.notifTx ?? true}
      notifMarketing={session?.notifMarketing ?? false}
      onToggle={(key) => onPatch({ [key]: !session?.[key as keyof Session] })}
      onBack={() => setPanel('main')}
    />
  )
  if (panel === 'network') return <NetworkPanel onBack={() => setPanel('main')} />

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="px-5 pt-8 pb-24 max-w-lg mx-auto">
        <h1 className="display text-2xl font-bold text-[var(--ink)] mb-6">Settings</h1>

        {/* Profile */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Profile</p>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl display flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>
              {(session?.displayName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveName() }}
                    className="flex-1 min-w-0 bg-transparent border-b-2 border-[var(--accent)] text-sm text-[var(--ink)] outline-none py-1" />
                  <button onClick={saveName} className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent)' }}>
                    <Check size={13} />
                  </button>
                  <button onClick={() => setEditingName(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-muted)' }}>
                    <X size={13} style={{ color: 'var(--muted)' }} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[var(--ink)] text-base truncate">{session?.displayName || 'No name set'}</p>
                  <button onClick={() => { setNameInput(session?.displayName ?? ''); setEditingName(true) }}
                    className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.15)' }}>
                    <Edit2 size={11} style={{ color: 'var(--accent)' }} />
                  </button>
                </div>
              )}
              {session?.email && <p className="text-xs text-[var(--muted)] truncate mt-0.5">{session.email}</p>}
            </div>
          </div>

          {/* Username + Account number */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
              <AtSign size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">Username</p>
                <p className="text-xs font-bold text-[var(--ink)] truncate">{session?.username ? `@${session.username}` : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
              <Hash size={13} style={{ color: '#0ea5e9', flexShrink: 0 }} />
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">Account No.</p>
                <p className="text-xs font-bold text-[var(--ink)] mono truncate">{session?.accountNumber ?? '—'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl mt-3" style={{ background: 'rgba(74,222,128,0.12)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Verified account</span>
          </div>
        </div>

        {/* Settings items */}
        <div className="space-y-2 mb-4">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest px-1 mb-1">Preferences</p>

          {[
            { id: 'security',      label: 'Security',      desc: 'Password, 2FA, active sessions', icon: Shield,   color: '#16a34a' },
            { id: 'notifications', label: 'Notifications', desc: 'Email and push preferences',     icon: Bell,     color: '#f59e0b' },
            { id: 'network',       label: 'Network',       desc: 'Arc Testnet · CCTP · chains',    icon: Globe,    color: '#0ea5e9' },
          ].map(({ id, label, desc, icon: Icon, color }) => (
            <button key={id} onClick={() => setPanel(id as SettingsPanel)}
              className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 text-left transition-fast hover:scale-[1.01] active:scale-95">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1a` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--ink)] text-sm">{label}</p>
                <p className="text-xs text-[var(--muted)]">{desc}</p>
              </div>
              <ChevronRight size={15} style={{ color: 'var(--subtle)' }} />
            </button>
          ))}

          <button onClick={() => navigate('about')}
            className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 text-left transition-fast hover:scale-[1.01] active:scale-95">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.12)' }}>
              <Info size={18} style={{ color: '#7c3aed' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--ink)] text-sm">About LimePay</p>
              <p className="text-xs text-[var(--muted)]">Version, docs, features, FAQ</p>
            </div>
            <ChevronRight size={15} style={{ color: 'var(--subtle)' }} />
          </button>
        </div>

        {/* App info */}
        <div className="glass-card rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--ink)]">LimePay</p>
            <p className="text-xs text-[var(--muted)]">Version 1.0.0 · Arc Testnet</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi size={13} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Connected</span>
          </div>
        </div>

        <button onClick={onLogout}
          className="w-full py-4 rounded-2xl font-bold text-sm transition-fast active:scale-95 flex items-center justify-center gap-2"
          style={{ background: 'rgba(220,38,38,0.10)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.20)' }}>
          <LogOut size={15} />
          Log Out
        </button>
      </div>
    </div>
  )
}

// ─── Security panel ────────────────────────────────────────────────────────────
function SecurityPanel({ onBack }: { onBack: () => void }) {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [saved, setSaved] = useState(false)

  const handleSavePw = () => {
    if (pw.next.length >= 8 && pw.next === pw.confirm) {
      setSaved(true)
      setShowChangePw(false)
      setPw({ current: '', next: '', confirm: '' })
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="px-5 pt-6 pb-24 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center transition-fast hover:scale-95"><ArrowLeft size={18} style={{ color: 'var(--ink)' }} /></button>
          <h1 className="display text-xl font-bold text-[var(--ink)]">Security</h1>
        </div>

        {saved && (
          <div className="mb-4 p-3 rounded-2xl flex items-center gap-2" style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}>
            <Check size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Password updated successfully</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Change password */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <button onClick={() => setShowChangePw((v) => !v)} className="w-full p-4 flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(22,163,74,0.12)' }}>
                <Lock size={18} style={{ color: '#16a34a' }} />
              </div>
              <div className="flex-1"><p className="font-semibold text-[var(--ink)] text-sm">Change Password</p><p className="text-xs text-[var(--muted)]">Update your account password</p></div>
              <ChevronRight size={15} style={{ color: 'var(--subtle)', transform: showChangePw ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showChangePw && (
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-3">
                {[
                  { id: 'current', label: 'Current password', key: 'current' as const },
                  { id: 'next', label: 'New password (min 8 chars)', key: 'next' as const },
                  { id: 'confirm', label: 'Confirm new password', key: 'confirm' as const },
                ].map(({ id, label, key }) => (
                  <div key={id}>
                    <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1">{label}</label>
                    <input type="password" value={pw[key]} onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl glass-inner border border-[var(--border)] text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] bg-transparent" />
                  </div>
                ))}
                <button onClick={handleSavePw} disabled={pw.next.length < 8 || pw.next !== pw.confirm}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: 'var(--accent)' }}>
                  Update Password
                </button>
              </div>
            )}
          </div>

          {/* 2FA */}
          <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <Smartphone size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[var(--ink)] text-sm">Two-Factor Authentication</p>
              <p className="text-xs text-[var(--muted)]">{twoFAEnabled ? 'Enabled — authenticator app' : 'Add an extra layer of security'}</p>
            </div>
            <Toggle enabled={twoFAEnabled} onToggle={() => setTwoFAEnabled((v) => !v)} />
          </div>

          {/* Biometric */}
          <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14,165,233,0.12)' }}>
              <User size={18} style={{ color: '#0ea5e9' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[var(--ink)] text-sm">Biometric Login</p>
              <p className="text-xs text-[var(--muted)]">Face ID or fingerprint unlock</p>
            </div>
            <Toggle enabled={biometricEnabled} onToggle={() => setBiometricEnabled((v) => !v)} />
          </div>

          {/* Active sessions */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.12)' }}>
                <Monitor size={18} style={{ color: '#7c3aed' }} />
              </div>
              <div>
                <p className="font-semibold text-[var(--ink)] text-sm">Active Sessions</p>
                <p className="text-xs text-[var(--muted)]">Devices currently logged in</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { device: 'This browser', location: 'Current session', current: true },
              ].map(({ device, location, current }) => (
                <div key={device} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink)]">{device}</p>
                    <p className="text-[10px] text-[var(--muted)]">{location}</p>
                  </div>
                  {current
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.18)', color: 'var(--accent)' }}>Active</span>
                    : <button className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(220,38,38,0.10)', color: 'var(--danger)' }}>Revoke</button>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Notifications panel ───────────────────────────────────────────────────────
function NotificationsPanel({ notifEmail, notifPush, notifTx, notifMarketing, onToggle, onBack }: {
  notifEmail: boolean; notifPush: boolean; notifTx: boolean; notifMarketing: boolean
  onToggle: (key: string) => void
  onBack: () => void
}) {
  const items = [
    { key: 'notifEmail',     icon: Mail,        color: '#16a34a', label: 'Email Notifications',   desc: 'Receive updates via email',            value: notifEmail },
    { key: 'notifPush',      icon: Bell,        color: '#f59e0b', label: 'Push Notifications',    desc: 'Browser and mobile push alerts',       value: notifPush },
    { key: 'notifTx',        icon: Monitor,     color: '#0ea5e9', label: 'Transaction Alerts',    desc: 'Get notified on every transaction',    value: notifTx },
    { key: 'notifMarketing', icon: Smartphone,  color: '#7c3aed', label: 'Marketing & Offers',    desc: 'Product updates and promotions',       value: notifMarketing },
  ]

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="px-5 pt-6 pb-24 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center transition-fast hover:scale-95"><ArrowLeft size={18} style={{ color: 'var(--ink)' }} /></button>
          <h1 className="display text-xl font-bold text-[var(--ink)]">Notifications</h1>
        </div>
        <div className="space-y-3">
          {items.map(({ key, icon: Icon, color, label, desc, value }) => (
            <div key={key} className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1a` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--ink)] text-sm">{label}</p>
                <p className="text-xs text-[var(--muted)]">{desc}</p>
              </div>
              <Toggle enabled={value} onToggle={() => onToggle(key)} />
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-[var(--muted)] text-center px-4">
          LimePay is on testnet. Email and push notifications are simulated in this demo environment.
        </p>
      </div>
    </div>
  )
}

// ─── Network panel ─────────────────────────────────────────────────────────────
function NetworkPanel({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState('Arc Testnet')

  const networks = [
    { name: 'Arc Testnet',     status: 'live',     chainId: '5042002',   rpc: 'https://rpc.testnet.arc.io',          note: 'Default · USDC as gas' },
    { name: 'Ethereum Sepolia',status: 'cctp',     chainId: '11155111',  rpc: 'https://rpc.sepolia.org',             note: 'CCTP bridge target' },
    { name: 'Base Sepolia',    status: 'cctp',     chainId: '84532',     rpc: 'https://sepolia.base.org',            note: 'CCTP bridge target' },
    { name: 'Arbitrum Sepolia',status: 'cctp',     chainId: '421614',    rpc: 'https://sepolia-rollup.arbitrum.io',  note: 'CCTP bridge target' },
    { name: 'Polygon Amoy',    status: 'cctp',     chainId: '80002',     rpc: 'https://rpc-amoy.polygon.technology', note: 'CCTP bridge target' },
    { name: 'Avalanche Fuji',  status: 'cctp',     chainId: '43113',     rpc: 'https://api.avax-test.network/ext/C', note: 'CCTP bridge target' },
  ]

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="px-5 pt-6 pb-24 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center transition-fast hover:scale-95"><ArrowLeft size={18} style={{ color: 'var(--ink)' }} /></button>
          <h1 className="display text-xl font-bold text-[var(--ink)]">Network</h1>
        </div>

        <div className="glass-card rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ border: '1px solid rgba(74,222,128,0.3)' }}>
          <Wifi size={18} style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-sm font-bold text-[var(--ink)]">Active: {selected}</p>
            <p className="text-xs text-[var(--muted)]">All transactions route through this network</p>
          </div>
        </div>

        <div className="space-y-2">
          {networks.map(({ name, status, chainId, note }) => (
            <button key={name} onClick={() => setSelected(name)}
              className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left transition-fast hover:scale-[1.01] active:scale-95">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: selected === name ? 'var(--accent)' : 'var(--border)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[var(--ink)] text-sm">{name}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{
                    background: status === 'live' ? 'rgba(74,222,128,0.18)' : 'rgba(14,165,233,0.14)',
                    color: status === 'live' ? 'var(--accent)' : '#0284c7',
                  }}>{status === 'live' ? 'LIVE' : 'CCTP'}</span>
                </div>
                <p className="text-xs text-[var(--muted)]">Chain ID {chainId} · {note}</p>
              </div>
              {selected === name && <Check size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
            </button>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
          <div className="flex items-center gap-2 mb-1">
            <WifiOff size={12} style={{ color: '#d97706' }} />
            <span className="text-xs font-bold" style={{ color: '#d97706' }}>Network switching note</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
            LimePay defaults to Arc Testnet for all transactions. Non-Arc networks are used only for CCTP bridge operations. Changing this setting affects bridge routing only.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Shared Toggle ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-11 h-6 rounded-full relative transition-all duration-200 flex-shrink-0"
      style={{ background: enabled ? 'var(--accent)' : 'var(--border)' }}
      aria-label={enabled ? 'Disable' : 'Enable'}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: enabled ? '1.375rem' : '0.125rem' }}
      />
    </button>
  )
}
