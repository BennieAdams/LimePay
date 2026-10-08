import { ConnectKitButton } from 'connectkit'
import { LayoutDashboard, RefreshCw, ArrowUpDown, Clock, LogOut, TrendingUp, Landmark, CreditCard, GitMerge, Receipt } from 'lucide-react'
import type { Page } from '../App'

interface TopNavProps {
  activePage: Page
  navigate: (page: Page) => void
  onLogout: () => void
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { id: 'swap',      label: 'Swap',      icon: <RefreshCw size={15} /> },
  { id: 'bridge',    label: 'Bridge',    icon: <GitMerge size={15} /> },
  { id: 'send',      label: 'Send',      icon: <ArrowUpDown size={15} /> },
  { id: 'bills',     label: 'Bills',     icon: <Receipt size={15} /> },
  { id: 'earn',      label: 'Earn',      icon: <TrendingUp size={15} /> },
  { id: 'borrow',    label: 'Borrow',    icon: <Landmark size={15} /> },
  { id: 'card',      label: 'Buy Crypto',icon: <CreditCard size={15} /> },
  { id: 'history',   label: 'History',   icon: <Clock size={15} /> },
]

export default function TopNav({ activePage, navigate, onLogout }: TopNavProps) {
  return (
    <nav
      className="hidden md:flex items-center justify-between px-6 lg:px-10 py-3 sticky top-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(15,34,24,0.08)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate('dashboard')}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>
          <span className="text-white font-black text-sm display">L</span>
        </div>
        <span className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>
          Lime<span style={{ color: 'var(--accent)' }}>Pay</span>
        </span>
      </div>

      {/* Nav links — scrollable on medium screens */}
      <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-fast hover:scale-[1.02] whitespace-nowrap flex-shrink-0"
            style={
              activePage === id
                ? { background: 'rgba(74,222,128,0.18)', color: 'var(--accent)' }
                : { color: 'var(--muted)' }
            }
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ConnectKitButton.Custom>
          {({ isConnected, show, address }) => (
            <button
              onClick={show}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-fast"
              style={isConnected ? { background: 'rgba(74,222,128,0.15)', color: 'var(--accent)' } : { background: 'var(--accent)', color: 'white' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isConnected ? 'var(--accent)' : 'rgba(255,255,255,0.5)' }} />
              {isConnected && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect Wallet'}
            </button>
          )}
        </ConnectKitButton.Custom>
        <button onClick={onLogout} className="w-8 h-8 rounded-xl flex items-center justify-center transition-fast hover:bg-red-50 hover:scale-95" aria-label="Log out">
          <LogOut size={15} style={{ color: 'var(--muted)' }} />
        </button>
      </div>
    </nav>
  )
}
