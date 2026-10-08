import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, TrendingUp, Check, AlertCircle, Info,
  ChevronRight, Zap, Shield, Lock,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { EARN_PRODUCTS, ASSET_MAP } from '../assets-config'
import { useTxStore } from '../tx-store'
import type { Page } from '../App'

interface Props {
  navigate: (page: Page) => void
}

export default function EarnPage({ navigate }: Props) {
  const { isConnected } = useAccount()
  const { addTx } = useTxStore()
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [deposited, setDeposited] = useState<string | null>(null)

  const handleDeposit = async () => {
    if (!isConnected) { toast.error('Connect your wallet first'); return }
    if (!depositAmount || parseFloat(depositAmount) <= 0) { toast.error('Enter a valid amount'); return }
    setDepositing(true)
    await new Promise((r) => setTimeout(r, 2200))
    setDepositing(false)
    addTx({ type: 'earn', asset: selectedProduct!, amount: depositAmount, status: 'confirmed', note: 'Earn deposit (indicative)' })
    setDeposited(`${depositAmount} ${selectedProduct}`)
    toast.success(`Deposit of ${depositAmount} ${selectedProduct} submitted!`)
    setDepositAmount('')
    setSelectedProduct(null)
  }

  const totalEarnRate = EARN_PRODUCTS.reduce((s, p) => s + p.apyNum, 0) / EARN_PRODUCTS.length

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
                                <span className="text-[var(--muted)]">Protocol</span>
                                <span className="font-semibold text-[var(--ink)]">{p.protocol}</span>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => { void handleDeposit() }}
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

          {/* Success notice */}
          {deposited && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 flex items-center gap-3 border-2" style={{ borderColor: 'var(--success)' }}>
              <Check size={18} style={{ color: 'var(--success)' }} />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Deposit submitted!</p>
                <p className="text-xs text-[var(--muted)]">{deposited} is now earning yield.</p>
              </div>
            </motion.div>
          )}

          {/* Disclaimer */}
          <div className="rounded-2xl p-4 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Info size={13} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
              Earn products are testnet demos. APY rates are indicative. Circle Yield and Arc Lending protocols require mainnet deployment. Not financial advice.
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
        </div>
      </div>
    </div>
  )
}
