import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface TermsPageProps {
  onBack: () => void
  onAccept: () => void
}

const SECTIONS = [
  {
    title: 'Terms of Service',
    content: `LimePay is a non-custodial digital payments application built on Arc and powered by Circle infrastructure. By using LimePay, you agree to use the application only for lawful purposes. You retain full control of your wallet keys and funds at all times. LimePay does not custody your assets.`,
  },
  {
    title: 'Privacy Policy',
    content: `LimePay collects minimal on-chain data required to provide the service. Your wallet address and transaction history are public on the Arc blockchain. We do not sell your personal data to third parties. Email addresses provided during registration are used solely for account recovery.`,
  },
  {
    title: 'Risk Disclosure',
    content: `Digital assets including USDC, EURC, and cirBTC are subject to market risk. Blockchain transactions are irreversible. This application operates on Arc Testnet for demonstration purposes. Never send real mainnet funds to testnet addresses. LimePay is not a regulated financial institution.`,
  },
  {
    title: 'Network Fees',
    content: `On Arc Testnet, transaction fees are paid in USDC (Arc's native gas token). Fee amounts vary by network congestion. LimePay does not add any additional service fees at this time. Cross-chain CCTP transfers may incur fees on the destination chain.`,
  },
]

export default function TermsPage({ onBack, onAccept }: TermsPageProps) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const [termsChecked, setTermsChecked] = useState(false)
  const [privacyChecked, setPrivacyChecked] = useState(false)

  const canProceed = termsChecked && privacyChecked

  return (
    <div
      className="min-h-dvh relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: 0, left: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.20) 0%, transparent 70%)', filter: 'blur(55px)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-5 md:px-10 pt-6 pb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <h1 className="display text-xl font-bold text-[var(--ink)]">Terms & Privacy</h1>
          <p className="text-xs text-[var(--muted)]">Step 2 of 3</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-5 md:px-10 py-3">
        <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden max-w-md">
          <div className="h-full w-2/3 rounded-full" style={{ background: 'var(--accent)' }} />
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex-1 px-5 md:px-0 pb-10 md:flex md:justify-center"
      >
        <div className="w-full md:max-w-md space-y-3 mt-4">
          {SECTIONS.map((s, i) => (
            <div key={i} className="glass-card rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left transition-fast hover:bg-white/30"
              >
                <span className="font-semibold text-[var(--ink)] text-sm">{s.title}</span>
                {expanded === i
                  ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} />
                  : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
                }
              </button>
              {expanded === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="px-5 pb-4"
                >
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{s.content}</p>
                </motion.div>
              )}
            </div>
          ))}

          {/* Checkboxes */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <CheckItem
              checked={termsChecked}
              onChange={setTermsChecked}
              label="I have read and agree to the Terms of Service"
              id="terms"
            />
            <CheckItem
              checked={privacyChecked}
              onChange={setPrivacyChecked}
              label="I have read and agree to the Privacy Policy"
              id="privacy"
            />
          </div>

          <button
            onClick={onAccept}
            disabled={!canProceed}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-fast active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-200"
            style={{ background: 'var(--accent)' }}
          >
            Accept & Continue
          </button>

          <p className="text-center text-xs text-[var(--subtle)]">
            You must accept both policies to continue
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function CheckItem({ checked, onChange, label, id }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  id: string
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <div
        className="mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-fast"
        style={{
          background: checked ? 'var(--accent)' : 'transparent',
          borderColor: checked ? 'var(--accent)' : 'var(--border-strong)',
        }}
      >
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </div>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span className="text-sm text-[var(--ink-2)] leading-snug group-hover:text-[var(--ink)] transition-fast">
        {label}
      </span>
    </label>
  )
}
