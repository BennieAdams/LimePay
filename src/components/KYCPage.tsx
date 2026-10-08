import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Wallet, UserCheck, Check, ChevronRight } from 'lucide-react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'

interface KYCPageProps {
  onBack: () => void
  onComplete: (displayName: string) => void
  prefillName?: string
}

type Step = 'choose' | 'verify' | 'done'

export default function KYCPage({ onBack, onComplete, prefillName = '' }: KYCPageProps) {
  const { address, isConnected } = useAccount()
  const [step, setStep] = useState<Step>('choose')
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState(prefillName)

  const handleVerify = async () => {
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    setIsLoading(false)
    setStep('done')
  }

  const formatAddr = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`

  return (
    <div
      className="min-h-dvh relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', bottom: '5%', right: '-5%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(132,204,22,0.20) 0%, transparent 70%)', filter: 'blur(50px)' }} />
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
          <h1 className="display text-xl font-bold text-[var(--ink)]">Connect Wallet</h1>
          <p className="text-xs text-[var(--muted)]">Step 3 of 3</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-5 md:px-10 py-3">
        <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden max-w-md">
          <div className="h-full w-full rounded-full transition-all duration-500" style={{ background: 'var(--accent)' }} />
        </div>
      </div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex-1 px-5 md:px-0 pb-safe md:flex md:justify-center"
      >
        <div className="w-full md:max-w-md mt-4">

          {step === 'done' ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-3xl p-8 text-center"
            >
              <div
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4"
                style={{ background: 'rgba(74,222,128,0.20)' }}
              >
                <Check size={36} style={{ color: 'var(--accent)' }} strokeWidth={3} />
              </div>
              <h2 className="display text-2xl font-bold text-[var(--ink)] mb-2">All Set!</h2>
              <p className="text-sm text-[var(--muted)] mb-2">Your wallet is connected and verified.</p>
              {address && (
                <div className="glass-inner rounded-xl px-3 py-2 mx-auto inline-block mb-6">
                  <span className="mono text-xs text-[var(--ink)]">{formatAddr(address)}</span>
                </div>
              )}
              <button
                onClick={() => onComplete(username)}
                className="w-full py-4 rounded-2xl font-bold text-white text-sm shadow-md shadow-green-200 transition-fast hover:scale-[1.01] active:scale-95"
                style={{ background: 'var(--accent)' }}
              >
                Go to Dashboard
              </button>
            </motion.div>
          ) : step === 'verify' ? (
            <div className="space-y-4">
              <div className="glass-card rounded-3xl p-6">
                <h2 className="display text-lg font-bold text-[var(--ink)] mb-1">Set a display name</h2>
                <p className="text-xs text-[var(--muted)] mb-4">This helps others identify you when sending payments.</p>

                {isConnected && address && (
                  <div className="glass-inner rounded-xl p-3 mb-4 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(74,222,128,0.25)' }}
                    >
                      <Wallet size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--muted)] font-medium">Connected wallet</div>
                      <div className="mono text-xs text-[var(--ink)]">{formatAddr(address)}</div>
                    </div>
                    <div className="ml-auto w-2 h-2 rounded-full bg-[var(--accent-light)] animate-pulse" />
                  </div>
                )}

                <label className="block text-xs font-semibold text-[var(--ink-2)] mb-1.5">Display Name</label>
                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl glass-inner border-2 border-transparent focus-within:border-[var(--accent)] transition-fast">
                  <UserCheck size={16} style={{ color: 'var(--subtle)' }} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Alex J."
                    className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder-[var(--subtle)] outline-none"
                  />
                </div>

                <button
                  onClick={() => { void handleVerify() }}
                  disabled={isLoading}
                  className="mt-4 w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200 transition-fast active:scale-95 disabled:opacity-60"
                  style={{ background: 'var(--accent)' }}
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    'Verify & Continue'
                  )}
                </button>
              </div>

              <button
                onClick={() => setStep('choose')}
                className="w-full py-3 text-sm font-medium text-[var(--muted)] underline"
              >
                Use a different wallet
              </button>
            </div>
          ) : (
            /* choose step */
            <div className="space-y-4">
              <div className="glass-card rounded-3xl p-6 mb-2">
                <h2 className="display text-xl font-bold text-[var(--ink)] mb-1">Connect your wallet</h2>
                <p className="text-sm text-[var(--muted)]">
                  LimePay is non-custodial. Connect your wallet to get started — your keys stay with you.
                </p>
              </div>

              <ConnectKitButton.Custom>
                {({ show, isConnected }) => (
                  <OptionCard
                    icon={<Wallet size={22} style={{ color: 'var(--accent)' }} />}
                    title="Connect Existing Wallet"
                    desc="MetaMask, Coinbase Wallet, WalletConnect, and more"
                    onClick={() => {
                      if (isConnected) {
                        setStep('verify')
                      } else {
                        show?.()
                      }
                    }}
                    badge={isConnected ? 'Connected' : undefined}
                  />
                )}
              </ConnectKitButton.Custom>

              <OptionCard
                icon={<UserCheck size={22} style={{ color: 'var(--accent)' }} />}
                title="Continue with Email"
                desc="Use your LimePay account without connecting an external wallet"
                onClick={() => setStep('verify')}
              />

              <p className="text-center text-xs text-[var(--subtle)] mt-2 px-4">
                LimePay never stores or accesses your private keys.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function OptionCard({ icon, title, desc, onClick, badge }: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className="w-full glass-card rounded-3xl p-5 flex items-center gap-4 text-left transition-fast hover:scale-[1.01] active:scale-95 hover:shadow-lg"
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(74,222,128,0.16)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--ink)] text-sm">{title}</span>
          {badge && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(74,222,128,0.25)', color: 'var(--accent)' }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--muted)] mt-0.5 leading-snug">{desc}</p>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--subtle)' }} className="flex-shrink-0" />
    </button>
  )
}
