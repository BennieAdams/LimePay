import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowUpRight, ArrowDownLeft, RefreshCw, Search,
  CreditCard, TrendingUp, Landmark, GitMerge, Trash2, ExternalLink, Receipt,
} from 'lucide-react'
import { useTxStore, type TxType, type TxRecord } from '../tx-store'
import type { Page } from '../App'

interface Props { navigate: (page: Page) => void }

type FilterType = TxType | 'all'

const TYPE_CONFIG: Record<TxType, { label: string; icon: typeof ArrowUpRight; color: string; bg: string }> = {
  send:    { label: 'Sent',     icon: ArrowUpRight,  color: 'var(--danger)',  bg: 'rgba(220,38,38,0.12)'    },
  receive: { label: 'Received', icon: ArrowDownLeft, color: 'var(--success)', bg: 'rgba(22,163,74,0.12)'    },
  swap:    { label: 'Swapped',  icon: RefreshCw,     color: '#f59e0b',        bg: 'rgba(245,158,11,0.12)'   },
  earn:    { label: 'Earned',   icon: TrendingUp,    color: '#8b5cf6',        bg: 'rgba(139,92,246,0.12)'   },
  borrow:  { label: 'Borrowed', icon: Landmark,      color: '#0ea5e9',        bg: 'rgba(14,165,233,0.12)'   },
  card:    { label: 'Card Buy', icon: CreditCard,    color: '#16a34a',        bg: 'rgba(74,222,128,0.12)'   },
  bridge:  { label: 'Bridged',  icon: GitMerge,      color: '#d97706',        bg: 'rgba(245,158,11,0.12)'   },
  bill:    { label: 'Bill Pay', icon: Receipt,       color: '#dc2626',        bg: 'rgba(239,68,68,0.12)'    },
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all',     label: 'All'      },
  { id: 'send',    label: 'Sent'     },
  { id: 'receive', label: 'Received' },
  { id: 'swap',    label: 'Swapped'  },
  { id: 'earn',    label: 'Earn'     },
  { id: 'borrow',  label: 'Borrow'   },
  { id: 'card',    label: 'Card'     },
  { id: 'bridge',  label: 'Bridge'   },
  { id: 'bill',    label: 'Bills'    },
]

function fmtDate(ms: number) {
  const d = new Date(ms)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - ms) / 86400000)
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function TxRow({ tx, i }: { tx: TxRecord; i: number }) {
  const cfg = TYPE_CONFIG[tx.type]
  const Icon = cfg.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="glass-card rounded-2xl p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
        <Icon size={17} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[var(--ink)] text-sm">{cfg.label}</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: tx.status === 'confirmed' ? 'rgba(22,163,74,0.15)' : tx.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(220,38,38,0.12)',
              color:      tx.status === 'confirmed' ? 'var(--success)'        : tx.status === 'pending' ? '#d97706'                : 'var(--danger)',
            }}
          >
            {tx.status}
          </span>
        </div>
        {tx.type === 'swap' && (
          <p className="text-xs text-[var(--muted)] truncate">{tx.amount} {tx.asset} → {tx.toAmount} {tx.toAsset}</p>
        )}
        {tx.type === 'bridge' && (
          <p className="text-xs text-[var(--muted)] truncate">{tx.fromChain} → {tx.toChain}</p>
        )}
        {tx.type === 'send' && tx.toAddress && (
          <p className="text-xs text-[var(--muted)] truncate mono">{tx.toAddress.slice(0, 8)}…{tx.toAddress.slice(-6)}</p>
        )}
        {tx.note && (
          <p className="text-xs text-[var(--muted)] truncate">{tx.note}</p>
        )}
        <p className="text-[10px] text-[var(--subtle)] mt-0.5">{fmtDate(tx.timestamp)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <div
          className="font-bold text-sm tabular"
          style={{ color: tx.type === 'receive' || tx.type === 'earn' ? 'var(--success)' : tx.type === 'send' ? 'var(--danger)' : 'var(--ink)' }}
        >
          {tx.type === 'receive' || tx.type === 'earn' ? '+' : tx.type === 'send' || tx.type === 'card' ? '' : ''}
          {tx.amount} {tx.asset}
        </div>
        {tx.hash && (
          <a
            href={`https://explorer.testnet.arc.io/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] flex items-center gap-0.5 justify-end mt-0.5"
            style={{ color: 'var(--accent)' }}
          >
            Explorer <ExternalLink size={9} />
          </a>
        )}
      </div>
    </motion.div>
  )
}

export default function TransactionHistory({ navigate }: Props) {
  const { txs, clearAll } = useTxStore()
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const filtered = txs.filter((tx) => {
    if (filter !== 'all' && tx.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        tx.asset.toLowerCase().includes(q) ||
        (tx.toAsset?.toLowerCase().includes(q) ?? false) ||
        (tx.toAddress?.toLowerCase().includes(q) ?? false) ||
        (tx.hash?.toLowerCase().includes(q) ?? false) ||
        (tx.note?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  return (
    <div className="min-h-dvh relative" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: 0, right: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.18) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-5 md:px-10 pt-6 pb-4">
        <button onClick={() => navigate('dashboard')} className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95" aria-label="Back">
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <h1 className="display text-xl font-bold text-[var(--ink)] flex-1">Activity</h1>
        {txs.length > 0 && (
          <button
            onClick={() => { if (confirm('Clear all transaction history?')) clearAll() }}
            className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95 hover:bg-red-50"
            aria-label="Clear history"
            title="Clear history"
          >
            <Trash2 size={15} style={{ color: 'var(--muted)' }} />
          </button>
        )}
      </div>

      <div className="relative z-10 px-5 md:px-0 pb-24 md:pb-10 md:flex md:justify-center">
        <div className="w-full md:max-w-2xl space-y-4">

          {/* Search */}
          <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
            <Search size={15} style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by asset, address, hash…"
              className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder-[var(--subtle)] outline-none"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-fast"
                style={
                  filter === id
                    ? { background: 'var(--accent)', color: 'white' }
                    : { background: 'rgba(255,255,255,0.7)', color: 'var(--muted)', border: '1px solid var(--border)' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Stats bar */}
          {txs.length > 0 && (
            <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
              <span className="text-xs text-[var(--muted)]">{filtered.length} of {txs.length} transactions</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                {txs.filter((t) => t.status === 'confirmed').length} confirmed
              </span>
            </div>
          )}

          {/* List */}
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <EmptyState key="empty" filter={filter} onNavigate={navigate} hasAny={txs.length > 0} />
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {filtered.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ filter, onNavigate, hasAny }: { filter: FilterType; onNavigate: (p: Page) => void; hasAny: boolean }) {
  const msgs: Record<FilterType, { title: string; desc: string; action: string; page: Page }> = {
    all:     { title: 'No activity yet',         desc: 'Make your first transfer, swap, or bridge to see transactions here.', action: 'Send now',      page: 'send'    },
    send:    { title: 'No outgoing transfers',   desc: 'Sent transactions will appear here.',                                 action: 'Send assets',   page: 'send'    },
    receive: { title: 'No incoming transfers',   desc: 'Received transactions will appear here.',                            action: 'Get address',   page: 'receive' },
    swap:    { title: 'No swaps yet',            desc: 'Swapped assets will appear here.',                                   action: 'Swap now',      page: 'swap'    },
    earn:    { title: 'No earn activity',        desc: 'Earn deposits will appear here.',                                    action: 'Start earning', page: 'earn'    },
    borrow:  { title: 'No borrow activity',      desc: 'Borrow positions will appear here.',                                 action: 'Borrow now',    page: 'borrow'  },
    card:    { title: 'No card purchases',       desc: 'Card buy transactions will appear here.',                            action: 'Buy crypto',    page: 'card'    },
    bridge:  { title: 'No bridge transactions',  desc: 'Bridged assets will appear here.',                                   action: 'Bridge now',    page: 'bridge'  },
    bill:    { title: 'No bill payments',        desc: 'Airtime, data, electricity and other bill payments appear here.',    action: 'Pay a bill',    page: 'bills'   },
  }
  const m = msgs[filter]
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-10 text-center">
      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(74,222,128,0.12)' }}>
        <RefreshCw size={24} style={{ color: 'var(--accent)' }} />
      </div>
      <p className="font-semibold text-[var(--ink)] mb-1">{m.title}</p>
      <p className="text-xs text-[var(--muted)] mb-5">{hasAny && filter !== 'all' ? `No "${filter}" transactions match your search.` : m.desc}</p>
      {!hasAny && (
        <button
          onClick={() => onNavigate(m.page)}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-fast hover:scale-[1.02] active:scale-95"
          style={{ background: 'var(--accent)' }}
        >
          {m.action}
        </button>
      )}
    </motion.div>
  )
}
