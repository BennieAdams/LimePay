import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ChevronRight, AlertCircle, Info, Check,
  Landmark, Shield, TrendingDown,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { BORROW_PRODUCTS, ASSET_MAP } from '../assets-config'
import { useTxStore } from '../tx-store'
import type { Page } from '../App'

interface Props {
  navigate: (page: Page) => void
}

export default function BorrowPage({ navigate }: Props) {
  const { isConnected } = useAccount()
  const { addTx } = useTxStore()
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [collateralAmount, setCollateralAmount] = useState('')
  const [borrowing, setBorrowing] = useState(false)
  const [borrowed, setBorrowed] = useState<string | null>(null)

  const product = selectedIdx !== null ? BORROW_PRODUCTS[selectedIdx] : null
  const collateralAsset = product ? ASSET_MAP[product.collateralSymbol] : null
  const borrowAsset = product ? ASSET_MAP[product.borrowSymbol] : null

  const maxBorrow = product && collateralAmount && parseFloat(collateralAmount) > 0
    ? (parseFloat(collateralAmount) * parseFloat(product.ltv) / 100).toFixed(2)
    : null

  const handleBorrow = async () => {
    if (!isConnected) { toast.error('Connect your wallet first'); return }
    if (!collateralAmount || parseFloat(collateralAmount) <= 0) { toast.error('Enter collateral amount'); return }
    setBorrowing(true)
    await new Promise((r) => setTimeout(r, 2200))
    setBorrowing(false)
    const msg = `${maxBorrow} ${product!.borrowSymbol} against ${collateralAmount} ${product!.collateralSymbol}`
    addTx({ type: 'borrow', asset: product!.borrowSymbol, amount: maxBorrow!, toAsset: product!.collateralSymbol, toAmount: collateralAmount, status: 'confirmed', note: `Collateral: ${collateralAmount} ${product!.collateralSymbol}` })
    setBorrowed(msg)
    toast.success(`Borrow position opened: ${msg}`)
    setCollateralAmount('')
    setSelectedIdx(null)
  }

  return (
    <div className="min-h-dvh relative" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-5%', left: '-8%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-5 md:px-10 pt-6 pb-4">
        <button onClick={() => navigate('dashboard')} className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95" aria-label="Back">
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <h1 className="display text-xl font-bold text-[var(--ink)]">Borrow</h1>
          <p className="text-xs text-[var(--muted)]">Borrow stablecoins against your crypto collateral</p>
        </div>
      </div>

      <div className="relative z-10 px-5 md:px-0 pb-24 md:pb-10 md:flex md:justify-center">
        <div className="w-full md:max-w-2xl space-y-5">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #3b82f6 100%)' }}
          >
            <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', filter: 'blur(40px)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Landmark size={16} className="text-white/80" />
                <span className="text-white/80 text-sm font-medium">Collateral-backed loans</span>
              </div>
              <div className="display text-4xl font-black text-white mb-1">From 7.2% APR</div>
              <p className="text-white/70 text-sm">Borrow USDC or EURC against BTC, ETH, or cirBTC</p>
              <div className="flex gap-3 mt-4 flex-wrap">
                {[{ icon: Shield, label: 'Non-liquidating demo' }, { icon: TrendingDown, label: 'Low APR' }].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.18)' }}>
                    <Icon size={12} className="text-white/80" />
                    <span className="text-white/90 text-xs font-semibold">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* How it works */}
          <div className="glass-card rounded-3xl p-5">
            <h3 className="display text-sm font-bold text-[var(--ink)] mb-3">How it works</h3>
            <div className="space-y-3">
              {[
                { step: '1', label: 'Deposit collateral', desc: 'Lock cirBTC, ETH, or BTC as security' },
                { step: '2', label: 'Receive stablecoins', desc: 'Borrow USDC/EURC up to the LTV ratio' },
                { step: '3', label: 'Repay to unlock', desc: 'Repay principal + interest to free collateral' },
              ].map(({ step, label, desc }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: 'var(--accent)' }}>{step}</div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
                    <p className="text-xs text-[var(--muted)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Borrow products */}
          <div className="space-y-3">
            <h2 className="display text-base font-bold text-[var(--ink)]">Borrow Markets</h2>
            {BORROW_PRODUCTS.map((p, i) => {
              const cAsset = ASSET_MAP[p.collateralSymbol]
              const bAsset = ASSET_MAP[p.borrowSymbol]
              const isSelected = selectedIdx === i
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-3xl overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedIdx(isSelected ? null : i)}
                    className="w-full flex items-center gap-4 p-5 text-left transition-fast hover:bg-white/60"
                  >
                    {/* Collateral + borrow icons */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-xs" style={{ background: cAsset.color }}>
                        {p.collateralSymbol === 'cirBTC' ? 'BTC' : p.collateralSymbol.slice(0, 3)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-[9px] border-2 border-white" style={{ background: bAsset.color }}>
                        {p.borrowSymbol.slice(0, 3)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[var(--ink)] text-sm mb-0.5">
                        {p.collateralSymbol} → {p.borrowSymbol}
                      </div>
                      <p className="text-xs text-[var(--muted)] truncate">{p.description}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">LTV: {p.ltv}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="display text-xl font-black" style={{ color: '#2563eb' }}>{p.apr}</div>
                      <div className="text-xs text-[var(--muted)]">APR</div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--subtle)', transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  <AnimatePresence>
                    {isSelected && collateralAsset && borrowAsset && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                          <p className="text-xs text-[var(--muted)] mb-3">Enter collateral amount</p>
                          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl glass-inner border-2 border-transparent focus-within:border-[var(--accent)] mb-3">
                            <span className="text-sm font-bold text-[var(--subtle)]">{collateralAsset.currencySymbol}</span>
                            <input
                              type="number" min="0" step="0.0001"
                              value={collateralAmount}
                              onChange={(e) => setCollateralAmount(e.target.value)}
                              placeholder="0.0000"
                              className="flex-1 bg-transparent text-lg font-bold text-[var(--ink)] placeholder-[var(--subtle)] outline-none tabular"
                            />
                            <span className="text-sm font-semibold text-[var(--muted)]">{p.collateralSymbol}</span>
                          </div>

                          {maxBorrow && (
                            <div className="glass-inner rounded-xl p-3 mb-3 space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Max you can borrow ({p.ltv} LTV)</span>
                                <span className="font-bold text-[var(--ink)]">{maxBorrow} {p.borrowSymbol}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Annual interest</span>
                                <span className="font-semibold text-[var(--ink)]">
                                  {(parseFloat(maxBorrow) * (p.aprNum / 100)).toFixed(4)} {p.borrowSymbol}/yr
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Liquidation threshold</span>
                                <span className="font-semibold" style={{ color: 'var(--danger)' }}>85% LTV</span>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => { void handleBorrow() }}
                            disabled={borrowing}
                            className="w-full py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-fast hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                            style={{ background: '#2563eb' }}
                          >
                            {borrowing
                              ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Opening position…</>
                              : <><Landmark size={15} /> Borrow {p.borrowSymbol}</>}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>

          {/* Success */}
          {borrowed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-4 flex items-center gap-3 border-2" style={{ borderColor: 'var(--success)' }}>
              <Check size={18} style={{ color: 'var(--success)' }} />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Position opened!</p>
                <p className="text-xs text-[var(--muted)]">{borrowed}</p>
              </div>
            </motion.div>
          )}

          {/* Disclaimer */}
          <div className="rounded-2xl p-4 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Info size={13} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
              Borrow markets are testnet demos only. LTV, APR, and liquidation thresholds are indicative. No real funds are involved. Not financial advice.
            </p>
          </div>

          {!isConnected && (
            <div className="glass-card rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Connect your wallet</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Connect to open borrow positions.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
