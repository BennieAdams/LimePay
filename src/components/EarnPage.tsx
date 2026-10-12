import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, TrendingUp, Check, AlertCircle, Info,
  ChevronRight, Zap, Shield, Lock, Wallet, ArrowUpRight,
  Clock, RefreshCw, X, AlertTriangle,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { EARN_PRODUCTS, ASSET_MAP } from '../assets-config'
import { useTxStore } from '../tx-store'
import type { Page } from '../App'

interface Props {
  navigate: (page: Page) => void
}

interface Deposit {
  id: string
  asset: string
  amount: number
  apyNum: number
  depositedAt: number
  protocol: string
}

/* eslint-disable react-compiler/react-compiler */

// Load/save deposits to localStorage
const DEP_KEY = 'limepay_earn_deposits'
function loadDeposits(): Deposit[] {
  try { const r = localStorage.getItem(DEP_KEY); return r ? (JSON.parse(r) as Deposit[]) : [] } catch { return [] }
}
function saveDeposits(d: Deposit[]) {
  try { localStorage.setItem(DEP_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

// Calculate accrued yield since deposit
function accruedYield(dep: Deposit, now: number): number {
  const elapsedMs = now - dep.depositedAt
  const elapsedYears = elapsedMs / (1000 * 60 * 60 * 24 * 365)
  return dep.amount * (dep.apyNum / 100) * elapsedYears
}

export default function EarnPage({ navigate }: Props) {
  const { isConnected } = useAccount()
  const { addTx } = useTxStore()
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [deposits, setDeposits] = useState<Deposit[]>(loadDeposits)
  const [renderCount, setRenderCount] = useState(0)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  // Confirmation modal state
  const [depositConfirm, setDepositConfirm] = useState(false)
  const [withdrawConfirm, setWithdrawConfirm] = useState<Deposit | null>(null)

  // Tick every 5s so yield display updates
  useEffect(() => {
    const id = setInterval(() => setRenderCount((c) => c + 1), 5000)
    return () => clearInterval(id)
  }, [])

  // eslint-disable-next-line react/purity
  const nowMs = Date.now() + renderCount * 0 // renderCount keeps this reactive

  const handleDeposit = async () => {
    if (!isConnected) { toast.error('Connect your wallet first'); return }
    if (!selectedProduct) { toast.error('Select a product'); return }
    const amt = parseFloat(depositAmount)
    if (!depositAmount || amt <= 0) { toast.error('Enter a valid amount'); return }

    const product = EARN_PRODUCTS.find((p) => p.assetSymbol === selectedProduct)
    if (!product) return

    setDepositing(true)
    await new Promise((r) => setTimeout(r, 2200))
    setDepositing(false)

    const dep: Deposit = {
      id: `dep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      asset: selectedProduct,
      amount: amt,
      apyNum: product.apyNum,
      depositedAt: Date.now(),
      protocol: product.protocol,
    }

    const updated = [dep, ...deposits]
    setDeposits(updated)
    saveDeposits(updated)

    addTx({
      type: 'earn',
      asset: selectedProduct,
      amount: depositAmount,
      status: 'confirmed',
      note: `Earn deposit via ${product.protocol}`,
    })

    toast.success(`${depositAmount} ${selectedProduct} deposited and earning!`)
    setDepositAmount('')
    setSelectedProduct(null)
  }

  const handleWithdraw = async (dep: Deposit) => {
    setWithdrawingId(dep.id)
    await new Promise((r) => setTimeout(r, 1800))
    // eslint-disable-next-line react/purity
    const earned = accruedYield(dep, Date.now())
    const total = dep.amount + earned

    addTx({
      type: 'earn',
      asset: dep.asset,
      amount: total.toFixed(6),
      status: 'confirmed',
      note: `Earn withdrawal — principal + yield`,
    })

    const updated = deposits.filter((d) => d.id !== dep.id)
    setDeposits(updated)
    saveDeposits(updated)
    setWithdrawingId(null)
    toast.success(`Withdrew ${total.toFixed(4)} ${dep.asset} (incl. yield)`)
  }

  const totalEarnRate = EARN_PRODUCTS.reduce((s, p) => s + p.apyNum, 0) / EARN_PRODUCTS.length
  const totalDeposited = deposits.reduce((s, d) => s + d.amount, 0)
  const totalYield = deposits.reduce((s, d) => s + accruedYield(d, nowMs), 0)

  return (
    <div className="min-h-dvh relative" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-5%', right: '-8%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.20) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-5 md:px-10 pt-6 pb-4">
        <button onClick={() => navigate('dashboard')} className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95" aria-label="Back">
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <h1 className="display text-xl font-bold text-[var(--ink)]">Earn</h1>
          <p className="text-xs text-[var(--muted)]">Deposit assets and earn passive yield</p>
        </div>
      </div>

      <div className="relative z-10 px-5 md:px-0 pb-24 md:pb-10 md:flex md:justify-center">
        <div className="w-full md:max-w-2xl space-y-5">

          {/* Hero stat card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #4ade80 80%, #a3e635 100%)' }}
          >
            <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', filter: 'blur(40px)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-white/80" />
                <span className="text-white/80 text-sm font-medium">Average APY</span>
              </div>
              <div className="display text-5xl font-black text-white mb-1">
                {totalEarnRate.toFixed(1)}%
              </div>
              <p className="text-white/70 text-sm">Earn on USDC, EURC, and cirBTC today</p>
              <div className="flex gap-3 mt-4 flex-wrap">
                {[{ icon: Shield, label: 'Non-custodial' }, { icon: Lock, label: 'Circle-secured' }, { icon: TrendingUp, label: 'Stable yield' }].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.20)' }}>
                    <Icon size={12} className="text-white/80" />
                    <span className="text-white/90 text-xs font-semibold">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* MY DEPOSITS SECTION */}
          {deposits.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Portfolio summary */}
              <div className="glass-card rounded-3xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} style={{ color: 'var(--accent)' }} />
                    <h2 className="display text-base font-bold text-[var(--ink)]">My Deposits</h2>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                    <RefreshCw size={11} />
                    <span>Live</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="glass-inner rounded-2xl p-3 text-center">
                    <p className="text-xs text-[var(--muted)] mb-1">Total Deposited</p>
                    <p className="display text-lg font-black text-[var(--ink)]">{totalDeposited.toFixed(4)}</p>
                    <p className="text-xs text-[var(--muted)]">across {deposits.length} position{deposits.length > 1 ? 's' : ''}</p>
                  </div>
                  <div className="glass-inner rounded-2xl p-3 text-center">
                    <p className="text-xs text-[var(--muted)] mb-1">Total Yield Earned</p>
                    <p className="display text-lg font-black" style={{ color: 'var(--accent)' }}>
                      +{totalYield < 0.000001 ? '0.000000' : totalYield.toFixed(6)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">growing every second</p>
                  </div>
                </div>

                {/* Individual deposit rows */}
                <div className="space-y-2">
                  {deposits.map((dep) => {
                    const product = EARN_PRODUCTS.find((p) => p.assetSymbol === dep.asset)
                    const a = ASSET_MAP[dep.asset]
                    const earned = accruedYield(dep, nowMs)
                    const elapsed = nowMs - dep.depositedAt
                    const elapsedStr = elapsed < 60000
                      ? `${Math.floor(elapsed / 1000)}s ago`
                      : elapsed < 3600000
                        ? `${Math.floor(elapsed / 60000)}m ago`
                        : elapsed < 86400000
                          ? `${Math.floor(elapsed / 3600000)}h ago`
                          : `${Math.floor(elapsed / 86400000)}d ago`

                    return (
                      <motion.div
                        key={dep.id}
                        layout
                        className="glass-inner rounded-2xl p-4"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0" style={{ background: a?.color ?? '#16a34a' }}>
                            {dep.asset === 'cirBTC' ? 'BTC' : dep.asset.slice(0, 3)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[var(--ink)] text-sm">{dep.asset}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(74,222,128,0.15)', color: '#15803d' }}>
                                {product?.apy ?? `${dep.apyNum}%`} APY
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                              <Clock size={10} />
                              <span>Deposited {elapsedStr} · {dep.protocol}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setWithdrawConfirm(dep)}
                            disabled={withdrawingId === dep.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-fast hover:scale-95 active:scale-90 disabled:opacity-50 flex items-center gap-1"
                            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                          >
                            {withdrawingId === dep.id
                              ? <span className="w-3 h-3 rounded-full border border-[var(--accent)] border-t-transparent animate-spin" />
                              : <><ArrowUpRight size={11} /> Withdraw</>}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white/40 rounded-xl p-2.5">
                            <p className="text-[var(--muted)] mb-0.5">Principal</p>
                            <p className="font-bold text-[var(--ink)] tabular">{dep.amount.toFixed(4)} {dep.asset}</p>
                          </div>
                          <div className="bg-white/40 rounded-xl p-2.5">
                            <p className="text-[var(--muted)] mb-0.5">Accrued Yield</p>
                            <p className="font-bold tabular" style={{ color: 'var(--accent)' }}>
                              +{earned < 0.000001 ? '0.000000' : earned.toFixed(6)} {dep.asset}
                            </p>
                          </div>
                          <div className="bg-white/40 rounded-xl p-2.5 col-span-2">
                            <p className="text-[var(--muted)] mb-0.5">Total Value (principal + yield)</p>
                            <p className="font-bold text-[var(--ink)] tabular">{(dep.amount + earned).toFixed(6)} {dep.asset}</p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Empty state for no deposits */}
          {deposits.length === 0 && (
            <div className="glass-card rounded-2xl p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.12)' }}>
                <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">No active deposits yet</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Deposit below to start earning yield — it grows every second.</p>
              </div>
            </div>
          )}

          {/* Product cards */}
          <div className="space-y-3">
            <h2 className="display text-base font-bold text-[var(--ink)]">Available Products</h2>
            {EARN_PRODUCTS.map((p, i) => {
              const a = ASSET_MAP[p.assetSymbol]
              const isSelected = selectedProduct === p.assetSymbol
              return (
                <motion.div
                  key={p.assetSymbol}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-3xl overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedProduct(isSelected ? null : p.assetSymbol)}
                    className="w-full flex items-center gap-4 p-5 text-left transition-fast hover:bg-white/60"
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ background: a.color }}>
                      {p.assetSymbol === 'cirBTC' ? 'BTC' : p.assetSymbol.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-[var(--ink)] text-sm">{p.assetSymbol}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: p.risk === 'Low' ? 'rgba(74,222,128,0.18)' : 'rgba(245,158,11,0.18)', color: p.risk === 'Low' ? '#15803d' : '#92400e' }}>
                          {p.risk} risk
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)] truncate">{p.description}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">via {p.protocol} · Min {p.minDeposit}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="display text-2xl font-black" style={{ color: 'var(--accent)' }}>{p.apy}</div>
                      <div className="text-xs text-[var(--muted)]">APY</div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--subtle)', transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                          <p className="text-xs text-[var(--muted)] mb-3">Enter amount to deposit</p>
                          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl glass-inner border-2 border-transparent focus-within:border-[var(--accent)] mb-3">
                            <span className="text-sm font-bold text-[var(--subtle)]">{a.currencySymbol}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              placeholder="0.00"
                              className="flex-1 bg-transparent text-lg font-bold text-[var(--ink)] placeholder-[var(--subtle)] outline-none tabular"
                            />
                            <span className="text-sm font-semibold text-[var(--muted)]">{p.assetSymbol}</span>
                          </div>
                          {depositAmount && parseFloat(depositAmount) > 0 && (
                            <div className="glass-inner rounded-xl p-3 mb-3 text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Estimated monthly yield</span>
                                <span className="font-semibold text-[var(--ink)]">
                                  {(parseFloat(depositAmount) * (p.apyNum / 100) / 12).toFixed(4)} {p.assetSymbol}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Estimated yearly yield</span>
                                <span className="font-semibold text-[var(--ink)]">
                                  {(parseFloat(depositAmount) * (p.apyNum / 100)).toFixed(4)} {p.assetSymbol}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Protocol</span>
                                <span className="font-semibold text-[var(--ink)]">{p.protocol}</span>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (!isConnected) { toast.error('Connect your wallet first'); return }
                              const amt = parseFloat(depositAmount)
                              if (!depositAmount || amt <= 0) { toast.error('Enter a valid amount'); return }
                              setDepositConfirm(true)
                            }}
                            disabled={depositing}
                            className="w-full py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-fast hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                            style={{ background: 'var(--accent)' }}
                          >
                            {depositing
                              ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Depositing…</>
                              : <><TrendingUp size={15} /> Deposit & Earn</>}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>

          {/* Disclaimer */}
          <div className="rounded-2xl p-4 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Info size={13} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
              Earn products are testnet demos. APY rates are indicative. Yield accrues in real time for demonstration purposes. Circle Yield and Arc Lending protocols require mainnet deployment. Not financial advice.
            </p>
          </div>

          {/* Not connected CTA */}
          {!isConnected && (
            <div className="glass-card rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Connect your wallet</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Connect to start earning yield on your assets.</p>
              </div>
            </div>
          )}

          {/* Success notice */}
          {deposits.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 flex items-center gap-3 border-2" style={{ borderColor: 'var(--success)' }}>
              <Check size={18} style={{ color: 'var(--success)' }} />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Deposits active</p>
                <p className="text-xs text-[var(--muted)]">Your funds are earning yield right now. Check back anytime to see your balance grow.</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── DEPOSIT CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {depositConfirm && selectedProduct && (() => {
          const product = EARN_PRODUCTS.find((p) => p.assetSymbol === selectedProduct)!
          const amt = parseFloat(depositAmount)
          const monthly = (amt * (product.apyNum / 100) / 12).toFixed(4)
          const yearly = (amt * (product.apyNum / 100)).toFixed(4)
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setDepositConfirm(false)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-5"
                style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xs" style={{ background: 'var(--accent)' }}>
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <h3 className="display font-bold text-[var(--ink)] text-base">Confirm Deposit</h3>
                      <p className="text-xs text-[var(--muted)]">Review before confirming</p>
                    </div>
                  </div>
                  <button onClick={() => setDepositConfirm(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.06)' }}>
                    <X size={14} style={{ color: 'var(--ink)' }} />
                  </button>
                </div>

                {/* Amount highlight */}
                <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
                  <p className="text-xs text-[var(--muted)] mb-1">You are depositing</p>
                  <p className="display text-4xl font-black text-[var(--ink)]">{amt.toLocaleString()}</p>
                  <p className="display text-xl font-bold mt-1" style={{ color: 'var(--accent)' }}>{selectedProduct}</p>
                </div>

                {/* Details rows */}
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Protocol', value: product.protocol },
                    { label: 'APY', value: product.apy, highlight: true },
                    { label: 'Est. monthly yield', value: `${monthly} ${selectedProduct}` },
                    { label: 'Est. yearly yield', value: `${yearly} ${selectedProduct}` },
                    { label: 'Risk level', value: `${product.risk} risk` },
                    { label: 'Minimum deposit', value: product.minDeposit },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                      <span className="text-[var(--muted)]">{label}</span>
                      <span className={`font-bold ${highlight ? 'text-green-600' : 'text-[var(--ink)]'}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 rounded-xl p-3 text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ color: '#92400e' }}>This is a testnet demo. No real funds will be moved. APY is indicative only.</p>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDepositConfirm(false)}
                    className="py-3.5 rounded-2xl font-bold text-sm border transition-fast hover:bg-gray-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setDepositConfirm(false); void handleDeposit() }}
                    disabled={depositing}
                    className="py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-fast hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {depositing
                      ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processing…</>
                      : <><TrendingUp size={15} /> Confirm Deposit</>}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ── WITHDRAW CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {withdrawConfirm && (() => {
          const dep = withdrawConfirm
          const product = EARN_PRODUCTS.find((p) => p.assetSymbol === dep.asset)
          // eslint-disable-next-line react/purity
          const earned = accruedYield(dep, Date.now())
          const total = dep.amount + earned
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setWithdrawConfirm(null)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-5"
                style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xs" style={{ background: '#3b82f6' }}>
                      <ArrowUpRight size={18} />
                    </div>
                    <div>
                      <h3 className="display font-bold text-[var(--ink)] text-base">Confirm Withdrawal</h3>
                      <p className="text-xs text-[var(--muted)]">You will receive principal + yield</p>
                    </div>
                  </div>
                  <button onClick={() => setWithdrawConfirm(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.06)' }}>
                    <X size={14} style={{ color: 'var(--ink)' }} />
                  </button>
                </div>

                {/* Total payout highlight */}
                <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
                  <p className="text-xs text-[var(--muted)] mb-1">You will receive</p>
                  <p className="display text-4xl font-black text-[var(--ink)]">{total.toFixed(6)}</p>
                  <p className="display text-xl font-bold mt-1" style={{ color: '#3b82f6' }}>{dep.asset}</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Principal', value: `${dep.amount.toFixed(4)} ${dep.asset}` },
                    { label: 'Accrued yield', value: `+${earned.toFixed(6)} ${dep.asset}`, highlight: true },
                    { label: 'APY earned', value: product?.apy ?? `${dep.apyNum}%` },
                    { label: 'Protocol', value: dep.protocol },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                      <span className="text-[var(--muted)]">{label}</span>
                      <span className={`font-bold ${highlight ? 'text-green-600' : 'text-[var(--ink)]'}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 rounded-xl p-3 text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ color: '#92400e' }}>This is a testnet demo. No real funds will be moved. Confirming will remove this position.</p>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setWithdrawConfirm(null)}
                    className="py-3.5 rounded-2xl font-bold text-sm border transition-fast hover:bg-gray-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setWithdrawConfirm(null); void handleWithdraw(dep) }}
                    disabled={withdrawingId === dep.id}
                    className="py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-fast hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                    style={{ background: '#3b82f6' }}
                  >
                    {withdrawingId === dep.id
                      ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processing…</>
                      : <><ArrowUpRight size={15} /> Confirm Withdrawal</>}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
