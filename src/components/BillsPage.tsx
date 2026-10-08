import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, Wifi, Zap, Tv, Trophy,
  ChevronRight, ArrowLeft, Check, AlertCircle, ChevronDown,
} from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, parseUnits } from 'viem'
import { getUsdc } from '@/onchain-facts'
import { useTxStore } from '../tx-store'
import type { Page } from '../App'
import { ASSETS } from '../assets-config'
import { toast } from 'sonner'

const ARC_CHAIN_ID = 5042002

interface BillsPageProps {
  navigate: (page: Page) => void
}

// ─── Service definitions ─────────────────────────────────────────────────────

type ServiceId = 'airtime' | 'data' | 'electricity' | 'tv' | 'betting'

interface Service {
  id: ServiceId
  label: string
  icon: React.ReactNode
  color: string
  bg: string
  desc: string
}

const SERVICES: Service[] = [
  { id: 'airtime',     label: 'Airtime',       icon: <Phone size={22} />,   color: '#16a34a', bg: 'rgba(74,222,128,0.15)',  desc: 'Top up any mobile number instantly' },
  { id: 'data',        label: 'Data',          icon: <Wifi size={22} />,    color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',  desc: 'Buy mobile data bundles' },
  { id: 'electricity', label: 'Electricity',   icon: <Zap size={22} />,     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  desc: 'Pay electricity bills & buy tokens' },
  { id: 'tv',          label: 'TV / Cable',    icon: <Tv size={22} />,      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  desc: 'Pay cable & streaming subscriptions' },
  { id: 'betting',     label: 'Betting',       icon: <Trophy size={22} />,  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   desc: 'Fund your betting wallet' },
]

// ─── Provider lists ───────────────────────────────────────────────────────────

const PROVIDERS: Record<ServiceId, string[]> = {
  airtime:     ['MTN', 'Airtel', 'Glo', '9mobile', 'Orange', 'Safaricom', 'Vodacom'],
  data:        ['MTN', 'Airtel', 'Glo', '9mobile', 'Orange', 'Safaricom'],
  electricity: ['Ikeja Electric (IKEDC)', 'Eko Electric (EKEDC)', 'Abuja Electric (AEDC)', 'Kano Electric (KEDCO)', 'Port Harcourt Electric (PHEDC)', 'Enugu Electric (EEDC)'],
  tv:          ['DSTV', 'GOtv', 'Startimes', 'ShowMax', 'Netflix via Partner', 'Amazon Prime via Partner'],
  betting:     ['Bet9ja', 'SportyBet', '1xBet', 'BetWinner', 'Betway', 'MerryBet', 'Parimatch'],
}

const DATA_BUNDLES: Record<string, { label: string; amount: string }[]> = {
  MTN:     [{ label: '500MB – 24hrs', amount: '0.33' }, { label: '1GB – 7 days', amount: '0.65' }, { label: '2GB – 30 days', amount: '1.30' }, { label: '5GB – 30 days', amount: '3.25' }, { label: '10GB – 30 days', amount: '6.50' }],
  Airtel:  [{ label: '500MB – 1 day',  amount: '0.33' }, { label: '1.5GB – 7 days', amount: '0.98' }, { label: '3GB – 30 days', amount: '1.95' }, { label: '6GB – 30 days', amount: '3.90' }],
  Glo:     [{ label: '1GB – 1 day',   amount: '0.48' }, { label: '2GB – 7 days',  amount: '0.97' }, { label: '5GB – 30 days',  amount: '2.92' }, { label: '10GB – 30 days', amount: '5.85' }],
  '9mobile': [{ label: '500MB', amount: '0.33' }, { label: '1GB', amount: '0.65' }, { label: '2.5GB', amount: '1.62' }],
}

const TV_PACKAGES: Record<string, { label: string; amount: string }[]> = {
  DSTV:     [{ label: 'Padi – ₦2,950', amount: '1.92' }, { label: 'Yanga – ₦4,615', amount: '3.00' }, { label: 'Confam – ₦7,100', amount: '4.61' }, { label: 'Compact – ₦15,700', amount: '10.20' }, { label: 'Compact Plus – ₦24,900', amount: '16.17' }, { label: 'Premium – ₦37,000', amount: '24.02' }],
  GOtv:     [{ label: 'Smallie – ₦1,625', amount: '1.05' }, { label: 'Jinja – ₦2,715', amount: '1.76' }, { label: 'Jolli – ₦4,115', amount: '2.67' }, { label: 'Max – ₦6,000', amount: '3.90' }, { label: 'Supa+ – ₦9,600', amount: '6.23' }],
  Startimes: [{ label: 'Basic – ₦1,700', amount: '1.10' }, { label: 'Smart – ₦2,800', amount: '1.82' }, { label: 'Classic – ₦3,800', amount: '2.47' }, { label: 'Super – ₦6,200', amount: '4.02' }],
  ShowMax:  [{ label: 'Mobile – ₦2,900/mo', amount: '1.88' }, { label: 'Standard – ₦5,900/mo', amount: '3.83' }],
  'Netflix via Partner': [{ label: 'Mobile', amount: '3.25' }, { label: 'Standard', amount: '5.85' }, { label: 'Premium', amount: '9.10' }],
  'Amazon Prime via Partner': [{ label: 'Monthly', amount: '2.92' }, { label: 'Annual (save 20%)', amount: '28.00' }],
}

// Supported payment assets
const PAY_ASSETS = ASSETS.filter((a) => ['USDC', 'EURC', 'NGN'].includes(a.symbol))

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BillsPage({ navigate }: BillsPageProps) {
  const [selected, setSelected] = useState<ServiceId | null>(null)

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 pb-32">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {selected ? (
            <button
              onClick={() => setSelected(null)}
              className="w-9 h-9 rounded-xl glass-card flex items-center justify-center transition-fast hover:scale-95"
            >
              <ArrowLeft size={16} style={{ color: 'var(--ink)' }} />
            </button>
          ) : (
            <button
              onClick={() => navigate('dashboard')}
              className="w-9 h-9 rounded-xl glass-card flex items-center justify-center transition-fast hover:scale-95"
            >
              <ArrowLeft size={16} style={{ color: 'var(--ink)' }} />
            </button>
          )}
          <div>
            <h1 className="display text-xl font-bold text-[var(--ink)]">
              {selected ? SERVICES.find((s) => s.id === selected)?.label ?? 'Bills' : 'Bill Payments'}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {selected ? 'Fill in details and pay with your preferred asset' : 'Pay bills with USDC, EURC, or NGN'}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div key="grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <ServiceGrid onSelect={setSelected} />
            </motion.div>
          ) : (
            <motion.div key={selected} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              <ServiceForm serviceId={selected} navigate={navigate} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Service Grid ─────────────────────────────────────────────────────────────

function ServiceGrid({ onSelect }: { onSelect: (id: ServiceId) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SERVICES.map(({ id, label, icon, color, bg, desc }) => (
        <motion.button
          key={id}
          onClick={() => onSelect(id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="glass-card rounded-2xl p-5 flex items-center gap-4 text-left transition-fast"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[var(--ink)] text-sm">{label}</div>
            <div className="text-xs text-[var(--muted)] mt-0.5 leading-snug">{desc}</div>
          </div>
          <ChevronRight size={14} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
        </motion.button>
      ))}
    </div>
  )
}

// ─── Service Form ─────────────────────────────────────────────────────────────

function ServiceForm({ serviceId, navigate }: { serviceId: ServiceId; navigate: (p: Page) => void }) {
  const { address } = useAccount()
  const { addTx } = useTxStore()
  const usdcFact = getUsdc(ARC_CHAIN_ID)

  const [provider, setProvider] = useState('')
  const [phone, setPhone] = useState('')
  const [meterNumber, setMeterNumber] = useState('')
  const [smartcard, setSmartcard] = useState('')
  const [bettingId, setBettingId] = useState('')
  const [amount, setAmount] = useState('')
  const [bundle, setBundle] = useState('')
  const [tvPackage, setTvPackage] = useState('')
  const [payAsset, setPayAsset] = useState('USDC')
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')

  const { writeContract, data: txHash, isPending: walletPending, error: writeError } = useWriteContract()
  const { isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const providers = PROVIDERS[serviceId]
  const bundles = (serviceId === 'data' && provider && DATA_BUNDLES[provider]) ? DATA_BUNDLES[provider] : null
  const packages = (serviceId === 'tv' && provider && TV_PACKAGES[provider]) ? TV_PACKAGES[provider] : null

  const selectedBundle = bundles?.find((b) => b.label === bundle)
  const selectedPackage = packages?.find((p) => p.label === tvPackage)
  const resolvedAmount = selectedBundle?.amount ?? selectedPackage?.amount ?? amount

  // Validation
  const isValid = (() => {
    if (!provider) return false
    if (serviceId === 'airtime') return phone.length >= 7 && parseFloat(resolvedAmount) > 0
    if (serviceId === 'data') return phone.length >= 7 && !!bundle
    if (serviceId === 'electricity') return meterNumber.length >= 6 && parseFloat(resolvedAmount) > 0
    if (serviceId === 'tv') return smartcard.length >= 4 && !!tvPackage
    if (serviceId === 'betting') return bettingId.length >= 3 && parseFloat(resolvedAmount) > 0
    return false
  })()

  const handlePay = useCallback(async () => {
    if (!isValid) return
    if (payAsset === 'USDC' && usdcFact && address) {
      try {
        const usdcAmount = parseUnits(resolvedAmount, 6)
        writeContract({
          address: usdcFact.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [address, usdcAmount], // self-transfer on testnet
          chainId: ARC_CHAIN_ID,
        })
      } catch {
        toast.error('Wallet transaction failed')
      }
    } else {
      // Indicative payment for non-USDC assets
      await new Promise((r) => setTimeout(r, 1200))
      addTx({
        type: 'bill',
        asset: payAsset,
        amount: resolvedAmount,
        note: `${SERVICES.find((s) => s.id === serviceId)?.label} – ${provider}`,
        status: 'confirmed',
      })
      setStep('success')
    }
  }, [isValid, payAsset, usdcFact, address, resolvedAmount, writeContract, addTx, serviceId, provider])

  // Watch for USDC tx success
  const prevSuccess = txSuccess
  if (txSuccess && !prevSuccess && txHash) {
    addTx({
      type: 'bill',
      asset: 'USDC',
      amount: resolvedAmount,
      hash: txHash,
      note: `${SERVICES.find((s) => s.id === serviceId)?.label} – ${provider}`,
      status: 'confirmed',
    })
    if (step !== 'success') setStep('success')
  }

  const svc = SERVICES.find((s) => s.id === serviceId)!

  if (step === 'success') {
    return (
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-3xl p-8 text-center">
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(74,222,128,0.20)' }}>
          <Check size={36} style={{ color: 'var(--accent)' }} strokeWidth={3} />
        </div>
        <h2 className="display text-2xl font-bold text-[var(--ink)] mb-2">Payment Sent!</h2>
        <p className="text-sm text-[var(--muted)] mb-1">{svc.label} via {provider}</p>
        <p className="text-lg font-bold tabular" style={{ color: 'var(--accent)' }}>{resolvedAmount} {payAsset}</p>
        {txHash && (
          <a href={`https://explorer.testnet.arc.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="block mt-2 text-xs font-medium underline truncate" style={{ color: 'var(--accent)' }}>
            View on explorer
          </a>
        )}
        <div className="flex gap-2 mt-6">
          <button onClick={() => { setStep('form'); setPhone(''); setAmount(''); setBundle(''); setTvPackage(''); setMeterNumber(''); setSmartcard(''); setBettingId(''); setProvider('') }}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold" style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
            Pay Again
          </button>
          <button onClick={() => navigate('dashboard')}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white" style={{ background: 'var(--accent)' }}>
            Dashboard
          </button>
        </div>
      </motion.div>
    )
  }

  if (step === 'confirm') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="glass-card rounded-3xl p-6">
          <h2 className="display text-lg font-bold text-[var(--ink)] mb-4">Confirm Payment</h2>
          <div className="space-y-3">
            {[
              { label: 'Service',  value: svc.label },
              { label: 'Provider', value: provider },
              serviceId === 'airtime' || serviceId === 'data' ? { label: 'Phone', value: phone } : null,
              serviceId === 'electricity' ? { label: 'Meter No.', value: meterNumber } : null,
              serviceId === 'tv' ? { label: 'Smartcard', value: smartcard } : null,
              serviceId === 'betting' ? { label: 'Betting ID', value: bettingId } : null,
              serviceId === 'data' ? { label: 'Bundle', value: bundle } : null,
              serviceId === 'tv' ? { label: 'Package', value: tvPackage } : null,
              { label: 'Amount', value: `${resolvedAmount} ${payAsset}` },
              { label: 'Pay with', value: payAsset },
            ].filter(Boolean).map((row) => row && (
              <div key={row.label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs text-[var(--muted)]">{row.label}</span>
                <span className="text-sm font-semibold text-[var(--ink)]">{row.value}</span>
              </div>
            ))}
          </div>

          {writeError && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
              <AlertCircle size={13} style={{ color: 'var(--danger)', marginTop: 1, flexShrink: 0 }} />
              <p className="text-xs" style={{ color: 'var(--danger)' }}>{writeError.message.slice(0, 120)}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setStep('form')} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold" style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
            Edit
          </button>
          <button
            onClick={() => { void handlePay() }}
            disabled={walletPending || txLoading}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {walletPending ? (<><Spinner /> Approve in wallet…</>) : txLoading ? (<><Spinner /> Processing…</>) : `Pay ${resolvedAmount} ${payAsset}`}
          </button>
        </div>
      </motion.div>
    )
  }

  // ── form step ──
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-3xl p-6 space-y-4">

        {/* Provider select */}
        <SelectField
          label="Provider"
          value={provider}
          onChange={setProvider}
          options={providers}
          placeholder="Select provider"
        />

        {/* Phone number (airtime / data) */}
        {(serviceId === 'airtime' || serviceId === 'data') && (
          <InputField
            label="Phone Number"
            value={phone}
            onChange={setPhone}
            placeholder="+234 800 000 0000"
            type="tel"
            icon={<Phone size={14} />}
          />
        )}

        {/* Meter number (electricity) */}
        {serviceId === 'electricity' && (
          <InputField
            label="Meter Number"
            value={meterNumber}
            onChange={setMeterNumber}
            placeholder="12345678901"
            icon={<Zap size={14} />}
          />
        )}

        {/* Smartcard (TV) */}
        {serviceId === 'tv' && (
          <InputField
            label="Smartcard / Decoder Number"
            value={smartcard}
            onChange={setSmartcard}
            placeholder="e.g. 1234567890"
            icon={<Tv size={14} />}
          />
        )}

        {/* Betting ID */}
        {serviceId === 'betting' && (
          <InputField
            label="User ID / Account Number"
            value={bettingId}
            onChange={setBettingId}
            placeholder="Your betting account ID"
            icon={<Trophy size={14} />}
          />
        )}

        {/* Data bundle picker */}
        {serviceId === 'data' && provider && (
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-2">Select Bundle</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(DATA_BUNDLES[provider] ?? DATA_BUNDLES.MTN).map((b) => (
                <button
                  key={b.label}
                  onClick={() => setBundle(b.label)}
                  className="text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-fast border-2"
                  style={bundle === b.label
                    ? { background: 'rgba(74,222,128,0.18)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                    : { background: 'var(--surface-muted)', borderColor: 'transparent', color: 'var(--ink-2)' }}
                >
                  <div className="font-semibold">{b.label}</div>
                  <div className="opacity-70">{b.amount} USDC</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TV package picker */}
        {serviceId === 'tv' && provider && (
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-2">Select Package</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(TV_PACKAGES[provider] ?? TV_PACKAGES.DSTV).map((p) => (
                <button
                  key={p.label}
                  onClick={() => setTvPackage(p.label)}
                  className="text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-fast border-2"
                  style={tvPackage === p.label
                    ? { background: 'rgba(74,222,128,0.18)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                    : { background: 'var(--surface-muted)', borderColor: 'transparent', color: 'var(--ink-2)' }}
                >
                  <div className="font-semibold">{p.label}</div>
                  <div className="opacity-70">{p.amount} USDC</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount (airtime, electricity, betting) */}
        {(serviceId === 'airtime' || serviceId === 'electricity' || serviceId === 'betting') && (
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-2)] mb-2">Amount (USDC equivalent)</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {['1', '2', '5', '10'].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="py-2.5 rounded-xl text-xs font-semibold border-2 transition-fast"
                  style={amount === v
                    ? { background: 'rgba(74,222,128,0.18)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                    : { background: 'var(--surface-muted)', borderColor: 'transparent', color: 'var(--ink-2)' }}
                >
                  ${v}
                </button>
              ))}
            </div>
            <InputField
              label=""
              value={amount}
              onChange={setAmount}
              placeholder="Custom amount"
              type="number"
              icon={<span className="text-xs font-bold text-[var(--subtle)]">$</span>}
            />
          </div>
        )}

        {/* Payment asset */}
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-2)] mb-2">Pay With</label>
          <div className="flex gap-2">
            {PAY_ASSETS.map((a) => (
              <button
                key={a.symbol}
                onClick={() => setPayAsset(a.symbol)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-fast"
                style={payAsset === a.symbol
                  ? { background: 'rgba(74,222,128,0.18)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                  : { background: 'var(--surface-muted)', borderColor: 'transparent', color: 'var(--ink-2)' }}
              >
                {a.symbol}
              </button>
            ))}
          </div>
          {payAsset !== 'USDC' && (
            <p className="mt-1.5 text-[10px] text-[var(--muted)]">
              Indicative rate — {payAsset} payments simulated on testnet
            </p>
          )}
        </div>

        {/* Summary */}
        {resolvedAmount && parseFloat(resolvedAmount) > 0 && (
          <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <span className="text-xs font-medium text-[var(--ink-2)]">You pay</span>
            <span className="font-bold tabular" style={{ color: 'var(--accent)' }}>{resolvedAmount} {payAsset}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => setStep('confirm')}
        disabled={!isValid}
        className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-fast hover:scale-[1.01] active:scale-95 disabled:opacity-40 shadow-md shadow-green-200"
        style={{ background: 'var(--accent)' }}
      >
        Continue
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InputField({
  label, value, onChange, placeholder, type = 'text', icon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  icon?: React.ReactNode
}) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1.5">{label}</label>}
      <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl glass-inner border-2 border-transparent focus-within:border-[var(--accent)] transition-fast">
        {icon && <span style={{ color: 'var(--subtle)' }}>{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder-[var(--subtle)] outline-none"
        />
      </div>
    </div>
  )
}

function SelectField({
  label, value, onChange, options, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-3.5 py-3 pr-9 rounded-xl glass-inner border-2 border-transparent focus:border-[var(--accent)] text-sm text-[var(--ink)] bg-transparent outline-none transition-fast"
          style={!value ? { color: 'var(--subtle)' } : {}}
        >
          <option value="" disabled>{placeholder ?? 'Select…'}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--subtle)' }} />
      </div>
    </div>
  )
}

function Spinner() {
  return <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
}
