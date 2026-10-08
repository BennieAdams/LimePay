import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CreditCard, Check, AlertCircle, Info,
  Lock, ShieldCheck, Zap, ChevronDown,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { useTxStore } from '../tx-store'
import type { Page } from '../App'

interface Props {
  navigate: (page: Page) => void
}

type FiatCurrency = 'USD' | 'EUR' | 'NGN' | 'GBP'
type TargetAsset = 'USDC' | 'EURC' | 'cirBTC' | 'ETH'

const FIAT_CURRENCIES: { code: FiatCurrency; name: string; symbol: string; flag: string }[] = [
  { code: 'USD', name: 'US Dollar',      symbol: '$',  flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro',           symbol: '€',  flag: '🇪🇺' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦',  flag: '🇳🇬' },
  { code: 'GBP', name: 'British Pound',  symbol: '£',  flag: '🇬🇧' },
]

const TARGET_ASSETS: { symbol: TargetAsset; name: string; color: string }[] = [
  { symbol: 'USDC',   name: 'USD Coin',    color: '#2775CA' },
  { symbol: 'EURC',   name: 'Euro Coin',   color: '#003087' },
  { symbol: 'cirBTC', name: 'Circle BTC',  color: '#F7931A' },
  { symbol: 'ETH',    name: 'Ethereum',    color: '#627EEA' },
]

// Indicative fiat->crypto rates (demo only)
const RATES: Record<string, Record<string, number>> = {
  USD: { USDC: 1.00, EURC: 0.92, cirBTC: 0.0000153, ETH: 0.000287 },
  EUR: { USDC: 1.087, EURC: 1.00, cirBTC: 0.0000166, ETH: 0.000312 },
  NGN: { USDC: 0.00065, EURC: 0.0006, cirBTC: 0.0000000099, ETH: 0.00000019 },
  GBP: { USDC: 1.27, EURC: 1.168, cirBTC: 0.0000194, ETH: 0.000365 },
}

type Step = 'amount' | 'card' | 'confirm' | 'success'

export default function CardPayPage({ navigate }: Props) {
  const { isConnected, address } = useAccount()
  const { addTx } = useTxStore()

  const [step, setStep] = useState<Step>('amount')
  const [fiat, setFiat] = useState<FiatCurrency>('USD')
  const [targetAsset, setTargetAsset] = useState<TargetAsset>('USDC')
  const [fiatAmount, setFiatAmount] = useState('')
  const [showFiatPicker, setShowFiatPicker] = useState(false)
  const [showAssetPicker, setShowAssetPicker] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Card fields
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardName, setCardName] = useState('')

  const fiatMeta = FIAT_CURRENCIES.find((c) => c.code === fiat)!
  const assetMeta = TARGET_ASSETS.find((a) => a.symbol === targetAsset)!
  const rate = RATES[fiat]?.[targetAsset] ?? 0
  const cryptoAmount = fiatAmount && parseFloat(fiatAmount) > 0
    ? (parseFloat(fiatAmount) * rate).toFixed(targetAsset === 'cirBTC' ? 8 : 4)
    : ''

  const feeAmount = fiatAmount && parseFloat(fiatAmount) > 0
    ? (parseFloat(fiatAmount) * 0.018).toFixed(2)
    : ''

  const formatCardNum = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return digits
  }

  const handleContinue = () => {
    if (!fiatAmount || parseFloat(fiatAmount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!isConnected) { toast.error('Connect your wallet first'); return }
    setStep('card')
  }

  const handleCardContinue = () => {
    const raw = cardNumber.replace(/\s/g, '')
    if (raw.length < 16) { toast.error('Enter a valid card number'); return }
    if (expiry.length < 5) { toast.error('Enter a valid expiry date'); return }
    if (cvv.length < 3) { toast.error('Enter a valid CVV'); return }
    if (!cardName.trim()) { toast.error('Enter the name on card'); return }
    setStep('confirm')
  }

  const handleConfirm = async () => {
    setProcessing(true)
    await new Promise((r) => setTimeout(r, 2500))
    setProcessing(false)
    addTx({ type: 'card', asset: targetAsset, amount: cryptoAmount, toAsset: fiat, toAmount: fiatAmount, status: 'confirmed', note: `Card purchase · ${fiatMeta.symbol}${fiatAmount} → ${cryptoAmount} ${targetAsset}` })
    setStep('success')
    toast.success(`Purchased ${cryptoAmount} ${targetAsset}!`)
  }

  const reset = () => {
    setStep('amount')
    setFiatAmount('')
    setCardNumber('')
    setExpiry('')
    setCvv('')
    setCardName('')
  }

  const STEPS: Step[] = ['amount', 'card', 'confirm', 'success']
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-dvh relative" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.22) 0%, transparent 70%)', filter: 'blur(55px)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-5 md:px-10 pt-6 pb-4">
        <button
          onClick={() => step === 'amount' ? navigate('dashboard') : setStep(STEPS[Math.max(0, stepIdx - 1)])}
          className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <h1 className="display text-xl font-bold text-[var(--ink)]">Buy Crypto</h1>
          <p className="text-xs text-[var(--muted)]">Pay with debit or credit card</p>
        </div>
      </div>

      {/* Step progress */}
      <div className="relative z-10 px-5 md:px-10 mb-5">
        <div className="flex items-center gap-2">
          {['Amount', 'Card', 'Confirm', 'Done'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-fast"
                  style={i <= stepIdx ? { background: 'var(--accent)', color: 'white' } : { background: 'var(--surface-muted)', color: 'var(--muted)' }}
                >
                  {i < stepIdx ? <Check size={12} /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block" style={{ color: i <= stepIdx ? 'var(--ink)' : 'var(--muted)' }}>{label}</span>
              </div>
              {i < 3 && <div className="flex-1 h-0.5 rounded-full w-6" style={{ background: i < stepIdx ? 'var(--accent)' : 'var(--border)' }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 px-5 md:px-0 pb-24 md:pb-10 md:flex md:justify-center">
        <div className="w-full md:max-w-md">
          <AnimatePresence mode="wait">

            {/* Step 1: Amount */}
            {step === 'amount' && (
              <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="glass-card rounded-3xl p-6">
                  <h2 className="display text-base font-bold text-[var(--ink)] mb-4">You pay</h2>

                  {/* Fiat amount + currency */}
                  <div className="glass-inner rounded-2xl p-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <button
                          onClick={() => { setShowFiatPicker((v) => !v); setShowAssetPicker(false) }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-fast hover:bg-white/60"
                          style={{ background: 'var(--surface-muted)' }}
                        >
                          <span>{fiatMeta.flag}</span>
                          <span className="text-[var(--ink)]">{fiat}</span>
                          <ChevronDown size={13} style={{ color: 'var(--subtle)' }} />
                        </button>
                        <AnimatePresence>
                          {showFiatPicker && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                              className="absolute left-0 z-30 rounded-2xl shadow-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid var(--border)', top: '100%', marginTop: 6, minWidth: 160 }}>
                              {FIAT_CURRENCIES.map((c) => (
                                <button key={c.code} onClick={() => { setFiat(c.code); setShowFiatPicker(false) }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 text-left">
                                  <span>{c.flag}</span>
                                  <span className="text-sm font-semibold text-[var(--ink)]">{c.code}</span>
                                  <span className="text-xs text-[var(--muted)]">{c.name}</span>
                                  {c.code === fiat && <Check size={12} style={{ color: 'var(--accent)', marginLeft: 'auto' }} />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <input
                        type="number" min="0" step="0.01"
                        value={fiatAmount}
                        onChange={(e) => setFiatAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-2xl font-bold text-[var(--ink)] placeholder-[var(--subtle)] outline-none tabular text-right"
                      />
                    </div>
                  </div>

                  {/* Quick amounts */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {['10', '25', '50', '100', '200'].map((q) => (
                      <button key={q} onClick={() => setFiatAmount(q)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-fast hover:scale-105"
                        style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
                        {fiatMeta.symbol}{q}
                      </button>
                    ))}
                  </div>

                  <h2 className="display text-base font-bold text-[var(--ink)] mb-3">You receive</h2>

                  {/* Target asset */}
                  <div className="glass-inner rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <button
                          onClick={() => { setShowAssetPicker((v) => !v); setShowFiatPicker(false) }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm text-white transition-fast hover:opacity-90"
                          style={{ background: assetMeta.color }}
                        >
                          {targetAsset} <ChevronDown size={13} />
                        </button>
                        <AnimatePresence>
                          {showAssetPicker && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                              className="absolute left-0 z-30 rounded-2xl shadow-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid var(--border)', top: '100%', marginTop: 6, minWidth: 160 }}>
                              {TARGET_ASSETS.map((a) => (
                                <button key={a.symbol} onClick={() => { setTargetAsset(a.symbol); setShowAssetPicker(false) }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 text-left">
                                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: a.color }}>
                                    {a.symbol.slice(0, 2)}
                                  </div>
                                  <span className="text-sm font-semibold text-[var(--ink)]">{a.symbol}</span>
                                  {a.symbol === targetAsset && <Check size={12} style={{ color: 'var(--accent)', marginLeft: 'auto' }} />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="flex-1 text-2xl font-bold text-right tabular" style={{ color: cryptoAmount ? 'var(--ink)' : 'var(--subtle)' }}>
                        {cryptoAmount || '0.0000'}
                      </div>
                    </div>
                    {fiatAmount && parseFloat(fiatAmount) > 0 && (
                      <div className="mt-3 pt-3 border-t text-xs space-y-1" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex justify-between text-[var(--muted)]">
                          <span>Rate</span>
                          <span className="tabular">1 {fiat} ≈ {rate.toFixed(rate < 0.001 ? 8 : 6)} {targetAsset}</span>
                        </div>
                        <div className="flex justify-between text-[var(--muted)]">
                          <span>Processing fee (1.8%)</span>
                          <span className="tabular">{fiatMeta.symbol}{feeAmount}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-4 flex items-start gap-2">
                  <ShieldCheck size={14} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Powered by Circle's onramp infrastructure. Card details are processed via PCI-DSS compliant tokenisation.
                  </p>
                </div>

                {!isConnected && (
                  <div className="glass-card rounded-2xl p-4 flex items-start gap-2" style={{ border: '1px solid rgba(245,158,11,0.35)' }}>
                    <AlertCircle size={14} style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: '#92400e' }}>Connect your wallet first to receive purchased crypto.</p>
                  </div>
                )}

                <button onClick={handleContinue}
                  className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200 transition-fast hover:scale-[1.01] active:scale-95"
                  style={{ background: 'var(--accent)' }}>
                  <CreditCard size={16} /> Continue to Card Details
                </button>
              </motion.div>
            )}

            {/* Step 2: Card details */}
            {step === 'card' && (
              <motion.div key="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="glass-card rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard size={18} style={{ color: 'var(--accent)' }} />
                    <h2 className="display text-base font-bold text-[var(--ink)]">Card Details</h2>
                    <Lock size={13} style={{ color: 'var(--muted)', marginLeft: 'auto' }} />
                    <span className="text-xs text-[var(--muted)]">Encrypted</span>
                  </div>

                  {/* Card preview */}
                  <div className="relative rounded-2xl p-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #4ade80 80%)', minHeight: 120 }}>
                    <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', filter: 'blur(30px)' }} />
                    <div className="relative z-10">
                      <p className="text-white/60 text-xs mb-2">Card Number</p>
                      <p className="mono text-white text-lg font-bold tracking-widest">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </p>
                      <div className="flex justify-between mt-3">
                        <div>
                          <p className="text-white/60 text-[10px]">Name</p>
                          <p className="text-white text-xs font-semibold">{cardName || 'YOUR NAME'}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-[10px]">Expires</p>
                          <p className="text-white text-xs font-semibold">{expiry || 'MM/YY'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1.5">Card Number</label>
                      <input
                        type="text" inputMode="numeric" maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNum(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-4 py-3 rounded-xl glass-inner text-sm mono text-[var(--ink)] placeholder-[var(--subtle)] outline-none border-2 border-transparent focus:border-[var(--accent)] transition-fast"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1.5">Name on Card</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 rounded-xl glass-inner text-sm text-[var(--ink)] placeholder-[var(--subtle)] outline-none border-2 border-transparent focus:border-[var(--accent)] transition-fast"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1.5">Expiry Date</label>
                        <input
                          type="text" inputMode="numeric" maxLength={5}
                          value={expiry}
                          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                          placeholder="MM/YY"
                          className="w-full px-4 py-3 rounded-xl glass-inner text-sm mono text-[var(--ink)] placeholder-[var(--subtle)] outline-none border-2 border-transparent focus:border-[var(--accent)] transition-fast"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1.5">CVV</label>
                        <input
                          type="text" inputMode="numeric" maxLength={4}
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          className="w-full px-4 py-3 rounded-xl glass-inner text-sm mono text-[var(--ink)] placeholder-[var(--subtle)] outline-none border-2 border-transparent focus:border-[var(--accent)] transition-fast"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={handleCardContinue}
                  className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200 transition-fast hover:scale-[1.01] active:scale-95"
                  style={{ background: 'var(--accent)' }}>
                  <Lock size={15} /> Review & Confirm
                </button>
              </motion.div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="glass-card rounded-3xl p-6">
                  <h2 className="display text-base font-bold text-[var(--ink)] mb-5">Confirm Purchase</h2>

                  <div className="space-y-3 mb-5">
                    {[
                      { label: 'You pay', value: `${fiatMeta.symbol}${fiatAmount} ${fiat}` },
                      { label: 'Processing fee (1.8%)', value: `${fiatMeta.symbol}${feeAmount}` },
                      { label: 'You receive', value: `${cryptoAmount} ${targetAsset}` },
                      { label: 'To address', value: address ? `${address.slice(0, 10)}…${address.slice(-6)}` : '—' },
                      { label: 'Network', value: 'Arc Testnet' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-xs text-[var(--muted)]">{label}</span>
                        <span className="text-xs font-semibold text-[var(--ink)] tabular">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="glass-inner rounded-xl p-3 mb-5 flex items-center gap-2">
                    <CreditCard size={14} style={{ color: 'var(--muted)' }} />
                    <span className="text-xs text-[var(--muted)]">Card ending in ****{cardNumber.replace(/\s/g, '').slice(-4)}</span>
                  </div>

                  <button
                    onClick={() => { void handleConfirm() }}
                    disabled={processing}
                    className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200 transition-fast hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    {processing
                      ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processing payment…</>
                      : <><Zap size={15} /> Confirm Purchase</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="glass-card rounded-3xl p-8 text-center">
                  <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(74,222,128,0.15)' }}>
                    <Check size={40} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h2 className="display text-2xl font-black text-[var(--ink)] mb-2">Payment Successful!</h2>
                  <p className="text-[var(--muted)] text-sm mb-1">You purchased</p>
                  <p className="display text-3xl font-black mb-1" style={{ color: assetMeta.color }}>{cryptoAmount} {targetAsset}</p>
                  <p className="text-xs text-[var(--muted)] mb-6">for {fiatMeta.symbol}{fiatAmount} {fiat}</p>

                  <div className="flex gap-3 justify-center flex-wrap">
                    <button onClick={() => navigate('dashboard')}
                      className="px-6 py-3 rounded-2xl font-bold text-white text-sm transition-fast hover:scale-[1.02] active:scale-95"
                      style={{ background: 'var(--accent)' }}>
                      Go to Dashboard
                    </button>
                    <button onClick={reset}
                      className="px-6 py-3 rounded-2xl font-bold text-sm transition-fast hover:scale-[1.02] active:scale-95"
                      style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}>
                      Buy Again
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Disclaimer (not on success) */}
          {step !== 'success' && (
            <div className="rounded-2xl p-4 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Info size={13} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
              <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
                This is a testnet demo. No real card charges occur. Rates are indicative. Circle Onramp Kit is used for production fiat-to-crypto flows.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
