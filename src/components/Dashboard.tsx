import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight, ArrowDownLeft, RefreshCw, Plus, Eye, EyeOff,
  Bell, Settings, TrendingUp, Wallet, ChevronRight, Info,
  Landmark, CreditCard, GitMerge, Receipt,
} from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { getUsdc } from '@/onchain-facts'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { ASSETS, USD_RATES, SOURCE_BADGE } from '../assets-config'
import type { Page } from '../App'

const ARC_CHAIN_ID = 5042002

interface DashboardProps {
  navigate: (page: Page) => void
  displayName?: string
}

const QUICK_ACTIONS = [
  { id: 'send',    label: 'Send',       icon: ArrowUpRight, color: '#16a34a', bg: 'rgba(74,222,128,0.15)' },
  { id: 'receive', label: 'Receive',    icon: ArrowDownLeft, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  { id: 'swap',    label: 'Swap',       icon: RefreshCw,    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { id: 'add',     label: 'Add Money',  icon: Plus,         color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  { id: 'earn',    label: 'Earn',       icon: TrendingUp,   color: '#16a34a', bg: 'rgba(74,222,128,0.12)'  },
  { id: 'borrow',  label: 'Borrow',     icon: Landmark,     color: '#2563eb', bg: 'rgba(37,99,235,0.10)'   },
  { id: 'card',    label: 'Buy Crypto', icon: CreditCard,   color: '#7c3aed', bg: 'rgba(124,58,237,0.10)'  },
  { id: 'bridge',  label: 'Bridge',     icon: GitMerge,     color: '#d97706', bg: 'rgba(245,158,11,0.10)'  },
  { id: 'bills',   label: 'Pay Bills',  icon: Receipt,      color: '#dc2626', bg: 'rgba(239,68,68,0.10)'   },
]

export default function Dashboard({ navigate, displayName }: DashboardProps) {
  const { address, isConnected } = useAccount()
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const usdcFact = getUsdc(ARC_CHAIN_ID)

  const { data: usdcRaw, isLoading: usdcLoading } = useReadContract({
    address: usdcFact?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: !!address && !!usdcFact },
  })

  const usdcBalance = usdcRaw !== undefined
    ? Amount.fromRaw(usdcRaw, usdcDecimalsFor(ARC_CHAIN_ID)).toFixed(2)
    : '0.00'

  // Build display rows: USDC live, rest indicative
  const tokenRows = ASSETS.map((a) => ({
    ...a,
    balance: a.symbol === 'USDC' ? (usdcLoading ? '…' : usdcBalance) : '0.00',
    usdValue: a.symbol === 'USDC'
      ? (usdcLoading ? '…' : `$${usdcBalance}`)
      : '$0.00',
    usdRate: USD_RATES[a.symbol] ?? 0,
  }))

  const visible = showAll ? tokenRows : tokenRows.slice(0, 5)
  const totalUsd = usdcLoading ? '…' : usdcBalance

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = displayName || (address ? `${address.slice(0, 6)}…` : 'User')
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null

  const onAction = (id: string) => {
    if (id === 'send' || id === 'add') navigate('send')
    else if (id === 'receive') navigate('receive')
    else if (id === 'swap') navigate('swap')
    else if (id === 'earn') navigate('earn')
    else if (id === 'borrow') navigate('borrow')
    else if (id === 'card') navigate('card')
    else if (id === 'bridge') navigate('bridge')
    else if (id === 'bills') navigate('bills')
    else if (id === 'history') navigate('history')
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">

      {/* ── MOBILE ── */}
      <div className="md:hidden">
        {/* Green header */}
        <div className="relative px-5 pt-6 pb-36 overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #16a34a 0%, #4ade80 80%, #a3e635 100%)' }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-15%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', filter: 'blur(40px)' }} />

          {/* Top row */}
          <div className="flex items-center justify-between mb-5 relative z-10">
            <div>
              <div className="text-white/70 text-xs">{greeting}</div>
              <div className="text-white text-lg font-bold display">{name}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('history')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.20)' }} aria-label="Notifications">
                <Bell size={17} className="text-white" />
              </button>
              <button onClick={() => navigate('settings')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.20)' }} aria-label="Settings">
                <Settings size={17} className="text-white" />
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="relative z-10">
            <div className="text-white/70 text-xs font-medium tracking-widest uppercase mb-1">Total Balance (USDC)</div>
            <div className="flex items-end gap-3">
              <div className="display text-4xl font-bold text-white tabular">
                {balanceHidden ? '••••••' : `$${totalUsd}`}
              </div>
              <button onClick={() => setBalanceHidden((h) => !h)} className="mb-1 text-white/70">
                {balanceHidden ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {shortAddr && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }}>
                <Wallet size={11} className="text-white/70" />
                <span className="mono text-white/80 text-[10px]">{shortAddr}</span>
              </div>
            )}
            {!isConnected && <div className="mt-2 text-white/70 text-xs">Connect wallet to view live balance</div>}
            {/* Asset chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {ASSETS.map((a) => (
                <span key={a.symbol} className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white" style={{ background: 'rgba(255,255,255,0.22)' }}>
                  {a.symbol}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Floating card — actions */}
        <div className="px-4 -mt-28 relative z-10">
          <div className="glass-card rounded-3xl p-4">
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.slice(0, 8).map(({ id, label, icon: Icon, color, bg }) => (
                <button key={id} onClick={() => onAction(id)} className="flex flex-col items-center gap-1.5 transition-fast active:scale-90">
                  <div className="rounded-2xl flex items-center justify-center" style={{ background: bg, width: 50, height: 50 }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <span className="text-[10px] font-medium text-[var(--ink-2)] text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Assets */}
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="display text-base font-bold text-[var(--ink)]">My Assets</h2>
            <button className="text-xs font-semibold" style={{ color: 'var(--accent)' }} onClick={() => navigate('swap')}>
              Swap
            </button>
          </div>
          <div className="space-y-2">
            {visible.map((t, i) => (
              <AssetRow key={t.symbol} asset={t} hidden={balanceHidden} delay={i * 0.04} />
            ))}
          </div>
          {tokenRows.length > 5 && (
            <button onClick={() => setShowAll((v) => !v)}
              className="mt-3 w-full py-2.5 rounded-2xl text-xs font-semibold text-center"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
              {showAll ? 'Show less' : `Show all ${tokenRows.length} assets`}
            </button>
          )}
        </div>

        {/* Note */}
        <div className="px-4 mt-4">
          <MockedNote />
        </div>

        {/* Recent */}
        <div className="px-4 mt-6 pb-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="display text-base font-bold text-[var(--ink)]">Recent Activity</h2>
            <button className="text-xs font-semibold" style={{ color: 'var(--accent)' }} onClick={() => navigate('history')}>View all</button>
          </div>
          <EmptyActivity />
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block max-w-7xl mx-auto px-8 lg:px-12 py-8">
        {/* Welcome row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-[var(--muted)]">{greeting}</p>
            <h1 className="display text-3xl font-bold text-[var(--ink)] mt-0.5">{name}</h1>
            {shortAddr && (
              <div className="flex items-center gap-1.5 mt-1">
                <Wallet size={12} style={{ color: 'var(--muted)' }} />
                <span className="mono text-xs text-[var(--muted)]">{shortAddr}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('history')} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center transition-fast hover:scale-95">
              <Bell size={18} style={{ color: 'var(--muted)' }} />
            </button>
            <button onClick={() => navigate('settings')} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center transition-fast hover:scale-95">
              <Settings size={18} style={{ color: 'var(--muted)' }} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left col */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Hero balance card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="relative rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(160deg, #16a34a 0%, #4ade80 80%, #a3e635 100%)' }}>
              <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', filter: 'blur(40px)' }} />
              <div className="relative z-10 p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="text-white/70 text-sm font-medium tracking-widest uppercase mb-2">Total Balance</div>
                    <div className="flex items-center gap-3">
                      <div className="display text-5xl font-bold text-white tabular">
                        {balanceHidden ? '••••••••' : `$${totalUsd}`}
                      </div>
                      <button onClick={() => setBalanceHidden((h) => !h)} className="text-white/70 mt-2">
                        {balanceHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <TrendingUp size={13} className="text-white/70" />
                      <span className="text-white/70 text-sm">Arc Testnet · 8 assets</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end max-w-[220px]">
                    {ASSETS.map((a) => (
                      <span key={a.symbol} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.22)' }}>
                        {a.symbol}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {QUICK_ACTIONS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => onAction(id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs text-white transition-fast hover:scale-[1.03] active:scale-95"
                      style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}>
                      <Icon size={13} />{label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Asset table */}
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="display text-lg font-bold text-[var(--ink)]">Assets</h2>
                <button className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--accent)' }} onClick={() => navigate('swap')}>
                  Swap <RefreshCw size={12} />
                </button>
              </div>
              {/* Header */}
              <div className="grid grid-cols-12 px-3 mb-2">
                <span className="col-span-5 text-xs text-[var(--muted)]">Asset</span>
                <span className="col-span-3 text-xs text-[var(--muted)] text-right">Balance</span>
                <span className="col-span-2 text-xs text-[var(--muted)] text-right">USD Value</span>
                <span className="col-span-2 text-xs text-[var(--muted)] text-right">Source</span>
              </div>
              <div className="space-y-1">
                {tokenRows.map((t, i) => <AssetRow key={t.symbol} asset={t} hidden={balanceHidden} desktop delay={i * 0.03} />)}
              </div>
              <MockedNote />
            </div>
          </div>

          {/* Right col */}
          <div className="col-span-12 lg:col-span-4 space-y-5">
            {/* Quick actions */}
            <div className="glass-card rounded-3xl p-5">
              <h2 className="display text-base font-bold text-[var(--ink)] mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_ACTIONS.map(({ id, label, icon: Icon, color, bg }) => (
                  <button key={id} onClick={() => onAction(id)}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-2xl transition-fast hover:scale-[1.03] active:scale-95"
                    style={{ background: bg }}>
                    <Icon size={20} style={{ color }} />
                    <span className="text-xs font-semibold text-[var(--ink)] text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent */}
            <div className="glass-card rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="display text-base font-bold text-[var(--ink)]">Recent Activity</h2>
                <button className="text-xs font-semibold" style={{ color: 'var(--accent)' }} onClick={() => navigate('history')}>View all</button>
              </div>
              <EmptyActivity />
            </div>

            {/* Network badge */}
            <div className="glass-card rounded-3xl p-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[var(--ink)]">Arc Testnet</div>
                <div className="text-xs text-[var(--muted)]">CCTP · Gateway · Circle</div>
              </div>
              <a href="https://explorer.testnet.arc.io" target="_blank" rel="noopener noreferrer" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                Explorer
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssetRow({ asset, hidden, desktop, delay = 0 }: {
  asset: { symbol: string; name: string; color: string; balance: string; usdValue: string; source: 'live' | 'circle' | 'bridge' | 'onramp' }
  hidden: boolean
  desktop?: boolean
  delay?: number
}) {
  const badge = SOURCE_BADGE[asset.source]
  const label = asset.symbol === 'cirBTC' ? 'BTC' : asset.symbol.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={desktop
        ? 'grid grid-cols-12 items-center p-3 rounded-2xl hover:bg-white/50 transition-fast cursor-pointer'
        : 'flex items-center gap-3 p-3.5 rounded-2xl glass-inner'}
    >
      {desktop ? (
        <>
          <div className="col-span-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: asset.color }}>
              {label}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-[var(--ink)] text-sm">{asset.symbol}</div>
              <div className="text-xs text-[var(--muted)] truncate">{asset.name}</div>
            </div>
          </div>
          <div className="col-span-3 text-right">
            <div className="font-bold text-[var(--ink)] tabular text-sm">{hidden ? '•••' : asset.balance}</div>
          </div>
          <div className="col-span-2 text-right">
            <div className="text-xs text-[var(--muted)] tabular">{hidden ? '•••' : asset.usdValue}</div>
          </div>
          <div className="col-span-2 text-right">
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: asset.color }}>
            {label}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--ink)] text-sm">{asset.symbol}</div>
            <div className="text-xs text-[var(--muted)]">{asset.name}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-[var(--ink)] tabular text-sm">{hidden ? '•••' : asset.balance}</div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          </div>
          <ChevronRight size={13} style={{ color: 'var(--subtle)' }} />
        </>
      )}
    </motion.div>
  )
}

function MockedNote() {
  return (
    <div className="mt-4 rounded-2xl p-3 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
      <Info size={12} style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
      <p className="text-[11px] leading-relaxed" style={{ color: '#92400e' }}>
        <strong>USDC</strong> balance is live on Arc Testnet. <strong>EURC, cirBTC</strong> are Circle ERC-20s (indicative). <strong>NGN, MOVE, APT, ETH, BTC</strong> are bridged/on-ramp representations — full Arc support requires registry additions.
      </p>
    </div>
  )
}

function EmptyActivity() {
  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: 'rgba(74,222,128,0.12)' }}>
        <Wallet size={22} style={{ color: 'var(--accent)' }} />
      </div>
      <p className="text-sm font-medium text-[var(--ink-2)]">No activity yet</p>
      <p className="text-xs text-[var(--muted)] mt-1">Send, swap, or deposit to get started</p>
    </div>
  )
}
