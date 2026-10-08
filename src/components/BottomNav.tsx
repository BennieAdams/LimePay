import { LayoutDashboard, RefreshCw, ArrowUpDown, Clock, TrendingUp, Landmark, CreditCard, GitMerge, Receipt, type LucideIcon } from 'lucide-react'
import type { Page } from '../App'

interface BottomNavProps {
  activePage: Page
  navigate: (page: Page) => void
}

const NAV_ITEMS: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Home',    icon: LayoutDashboard },
  { id: 'swap',      label: 'Swap',    icon: RefreshCw },
  { id: 'bills',     label: 'Bills',   icon: Receipt },
  { id: 'bridge',    label: 'Bridge',  icon: GitMerge },
  { id: 'earn',      label: 'Earn',    icon: TrendingUp },
  { id: 'borrow',    label: 'Borrow',  icon: Landmark },
  { id: 'card',      label: 'Buy',     icon: CreditCard },
  { id: 'send',      label: 'Send',    icon: ArrowUpDown },
  { id: 'history',   label: 'History', icon: Clock },
]

export default function BottomNav({ activePage, navigate }: BottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1"
      style={{
        background: 'rgba(255,255,255,0.93)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(15,34,24,0.08)',
        paddingTop: '0.4rem',
        paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))',
      }}
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = activePage === id
        return (
          <button
            key={id}
            onClick={() => navigate(id)}
            className="flex flex-col items-center gap-0.5 flex-1 py-1 min-h-[44px] justify-center transition-fast"
            aria-label={label}
          >
            <div className="w-9 h-7 rounded-xl flex items-center justify-center transition-fast"
              style={isActive ? { background: 'rgba(74,222,128,0.20)' } : {}}>
              <Icon size={17} style={{ color: isActive ? 'var(--accent)' : 'var(--subtle)' }} />
            </div>
            <span className="text-[9px] font-semibold" style={{ color: isActive ? 'var(--accent)' : 'var(--subtle)' }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
