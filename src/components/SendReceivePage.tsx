import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowUpRight, ArrowDownLeft, Copy, Check,
  QrCode, Wallet, AlertCircle, ExternalLink, ChevronDown,
  AtSign, Hash, User2, Search, X,
} from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { erc20Abi, isAddress } from 'viem'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { parseAmount } from '@/onchain-money'
import { toast } from 'sonner'
import { ASSETS, ASSET_MAP } from '../assets-config'
import { useTxStore } from '../tx-store'
import { resolveRecipient, type RegistryEntry } from '../user-registry'
import type { Page } from '../App'

const ARC_CHAIN_ID = 5042002

function getTokenAddress(symbol: string): string | undefined {
  if (symbol === 'USDC') return getUsdc(ARC_CHAIN_ID)?.address
  return undefined
}

type Tab = 'send' | 'receive'
type RecipientMode = 'wallet' | 'username' | 'account'

interface Props {
  navigate: (page: Page) => void
  initialTab?: Tab
  /** Own account number (from session registry) */
  accountNumber?: string
  username?: string
}

const MODE_CONFIG: { id: RecipientMode; label: string; icon: typeof Wallet; placeholder: string; hint: string }[] = [
  { id: 'wallet',   label: 'Wallet Address', icon: Wallet,  placeholder: '0x...abcdef',       hint: 'Enter a full 0x wallet address' },
  { id: 'username', label: 'Username',        icon: AtSign,  placeholder: '@alex_j',           hint: 'Enter a LimePay @username' },
  { id: 'account',  label: 'Account Number',  icon: Hash,    placeholder: 'LP-12345678',       hint: 'Enter a LimePay LP-XXXXXXXX account number' },
]

export default function SendReceivePage({ navigate, initialTab = 'send', accountNumber, username }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const { addTx, updateTx } = useTxStore()

  const [selectedSymbol, setSelectedSymbol] = useState('USDC')
  const [showPicker, setShowPicker] = useState(false)
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('wallet')
  const [recipient, setRecipient] = useState('')
  const [resolvedEntry, setResolvedEntry] = useState<RegistryEntry | null>(null)
  const [resolveStatus, setResolveStatus] = useState<'idle' | 'resolving' | 'found' | 'not_found'>('idle')
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [recipientError, setRecipientError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [lastTxId, setLastTxId] = useState<string | null>(null)

  const selectedAsset = ASSET_MAP[selectedSymbol]
  const tokenAddress = getTokenAddress(selectedSymbol)
  const isWrongChain = chainId !== ARC_CHAIN_ID

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  if (isSuccess && txHash && lastTxId) {
    updateTx(lastTxId, { status: 'confirmed', hash: txHash })
  }

  // ─── Recipient resolution ─────────────────────────────────────────────────
  const handleResolve = useCallback(() => {
    const trimmed = recipient.trim()
    if (!trimmed) return
    if (recipientMode === 'wallet') {
      // Wallet address — resolve for display name only, address used directly
      const entry = resolveRecipient(trimmed)
      setResolvedEntry(entry)
      setResolveStatus('idle')
      return
    }
    setResolveStatus('resolving')
    // Simulate async lookup (local registry is sync but mimics network latency)
    setTimeout(() => {
      const entry = resolveRecipient(trimmed)
      if (entry) {
        setResolvedEntry(entry)
        setResolveStatus('found')
        setRecipientError('')
      } else {
        setResolvedEntry(null)
        setResolveStatus('not_found')
      }
    }, 600)
  }, [recipient, recipientMode])

  const clearRecipient = () => {
    setRecipient('')
    setResolvedEntry(null)
    setResolveStatus('idle')
    setRecipientError('')
  }

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = (): { ok: boolean; effectiveAddress: string } => {
    let ok = true
    let effectiveAddress = ''

    if (recipientMode === 'wallet') {
      if (!isAddress(recipient.trim())) {
        setRecipientError('Enter a valid wallet address (0x…)')
        ok = false
      } else {
        setRecipientError('')
        effectiveAddress = recipient.trim()
      }
    } else {
      if (resolveStatus !== 'found' || !resolvedEntry) {
        setRecipientError(
          resolveStatus === 'not_found'
            ? 'No LimePay user found with that username or account number'
            : 'Resolve the recipient first — click "Look up"',
        )
        ok = false
      } else if (!resolvedEntry.walletAddress) {
        setRecipientError('This user has not connected a wallet yet and cannot receive on-chain transfers')
        ok = false
      } else {
        setRecipientError('')
        effectiveAddress = resolvedEntry.walletAddress
      }
    }

    const num = parseFloat(amount)
    if (!amount || isNaN(num) || num <= 0) {
      setAmountError('Enter a valid amount greater than 0')
      ok = false
    } else {
      setAmountError('')
    }

    return { ok, effectiveAddress }
  }

  // ─── Send ─────────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!isConnected) { toast.error('Connect your wallet first'); return }
    const { ok, effectiveAddress } = validate()
    if (!ok) return
    if (isWrongChain) { switchChain({ chainId: ARC_CHAIN_ID }); return }

    const recipientLabel =
      resolvedEntry
        ? `${resolvedEntry.displayName} (${resolvedEntry.accountNumber})`
        : effectiveAddress

    if (selectedSymbol !== 'USDC') {
      const id = addTx({
        type: 'send',
        asset: selectedSymbol,
        amount,
        toAddress: effectiveAddress || recipient,
        status: 'confirmed',
        note: `Indicative send to ${recipientLabel}`,
      })
      setLastTxId(id)
      toast.info(`${selectedSymbol} transfer is indicative on testnet.`)
      return
    }

    if (!tokenAddress) { toast.error(`${selectedSymbol} contract not available`); return }

    try {
      const id = addTx({ type: 'send', asset: selectedSymbol, amount, toAddress: effectiveAddress, status: 'pending', note: `To ${recipientLabel}` })
      setLastTxId(id)
      const parsed = parseAmount(ARC_CHAIN_ID, amount)
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [effectiveAddress as `0x${string}`, parsed.raw],
        chainId: ARC_CHAIN_ID,
      })
    } catch (e: unknown) {
      setAmountError(e instanceof Error ? e.message : 'Invalid amount')
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopied(key)
    toast.success('Copied!')
    setTimeout(() => setCopied(null), 2000)
  }

  const quickAmounts = ['10', '25', '50', '100']
  const currencyPfx = selectedAsset?.currencySymbol ?? '$'
  const currentMode = MODE_CONFIG.find((m) => m.id === recipientMode)!

  return (
    <div className="min-h-dvh relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.22) 0%, transparent 70%)', filter: 'blur(55px)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-5 md:px-10 pt-6 pb-4">
        <button onClick={() => navigate('dashboard')} className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95" aria-label="Back">
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <h1 className="display text-xl font-bold text-[var(--ink)]">{tab === 'send' ? 'Send' : 'Receive'}</h1>
      </div>

      {/* Tab bar */}
      <div className="relative z-10 px-5 md:px-10 mb-4">
        <div className="inline-flex p-1 rounded-2xl glass-card">
          {(['send', 'receive'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); reset() }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-fast"
              style={tab === t ? { background: 'var(--accent)', color: 'white' } : { color: 'var(--muted)' }}>
              {t === 'send' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
              {t === 'send' ? 'Send' : 'Receive'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 px-5 md:px-0 pb-24 md:pb-10 md:flex md:justify-center">
        <div className="w-full md:max-w-lg">
          <AnimatePresence mode="wait">

            {/* ── SEND ── */}
            {tab === 'send' ? (
              <motion.div key="send" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">

                {/* Asset selector */}
                <div className="glass-card rounded-3xl p-5">
                  <label className="block text-xs font-semibold text-[var(--ink-2)] mb-3">Asset</label>
                  <div className="relative">
                    <button onClick={() => setShowPicker((v) => !v)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl glass-inner text-sm font-semibold transition-fast hover:bg-white/60">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: selectedAsset.color }}>
                        {selectedSymbol === 'cirBTC' ? 'BTC' : selectedSymbol.slice(0, 3)}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-[var(--ink)] font-semibold">{selectedSymbol}</span>
                        <span className="ml-2 text-xs text-[var(--muted)]">{selectedAsset.name}</span>
                      </div>
                      <ChevronDown size={15} style={{ color: 'var(--subtle)' }} />
                    </button>
                    <AnimatePresence>
                      {showPicker && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          className="absolute left-0 right-0 z-30 rounded-2xl shadow-xl overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid var(--border)', top: '100%', marginTop: 6 }}>
                          <div className="max-h-60 overflow-y-auto">
                            {ASSETS.map((a) => (
                              <button key={a.symbol} onClick={() => { setSelectedSymbol(a.symbol); setShowPicker(false); setAmount('') }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-fast text-left">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs" style={{ background: a.color }}>
                                  {a.symbol === 'cirBTC' ? 'BTC' : a.symbol.slice(0, 3)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-[var(--ink)]">{a.symbol}</div>
                                  <div className="text-xs text-[var(--muted)] truncate">{a.name}</div>
                                </div>
                                {a.symbol === selectedSymbol && <Check size={14} style={{ color: 'var(--accent)' }} />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {selectedAsset.source !== 'live' && (
                    <p className="mt-2 text-xs" style={{ color: '#92400e' }}>
                      ⚠ {selectedSymbol} uses an indicative balance on testnet.
                    </p>
                  )}
                </div>

                {/* Recipient */}
                <div className="glass-card rounded-3xl p-5 space-y-3">
                  <label className="block text-xs font-semibold text-[var(--ink-2)]">Send To</label>

                  {/* Mode tabs */}
                  <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                    {MODE_CONFIG.map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => { setRecipientMode(id); clearRecipient() }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-fast"
                        style={recipientMode === id
                          ? { background: 'white', color: 'var(--accent)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                          : { color: 'var(--muted)' }}>
                        <Icon size={12} />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{id === 'wallet' ? 'Wallet' : id === 'username' ? '@User' : 'Acct#'}</span>
                      </button>
                    ))}
                  </div>

                  {/* Input row */}
                  <div>
                    <div className={`flex items-center gap-2 px-3.5 py-3 rounded-xl glass-inner border-2 transition-fast focus-within:border-[var(--accent)] ${recipientError ? 'border-[var(--danger)]' : 'border-transparent'}`}>
                      <currentMode.icon size={15} style={{ color: recipientError ? 'var(--danger)' : 'var(--subtle)', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => { setRecipient(e.target.value); setResolveStatus('idle'); setResolvedEntry(null); setRecipientError('') }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && recipientMode !== 'wallet') handleResolve() }}
                        placeholder={currentMode.placeholder}
                        className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder-[var(--subtle)] outline-none mono"
                      />
                      {recipient && (
                        <button onClick={clearRecipient} className="flex-shrink-0 text-[var(--subtle)] hover:text-[var(--muted)]">
                          <X size={14} />
                        </button>
                      )}
                      {recipientMode !== 'wallet' && recipient && resolveStatus !== 'found' && (
                        <button onClick={handleResolve}
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white transition-fast hover:scale-[1.03] active:scale-95"
                          style={{ background: 'var(--accent)' }}>
                          {resolveStatus === 'resolving'
                            ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Search size={11} />}
                          {resolveStatus === 'resolving' ? '' : 'Look up'}
                        </button>
                      )}
                    </div>

                    {/* Resolved user card */}
                    <AnimatePresence>
                      {resolveStatus === 'found' && resolvedEntry && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="mt-2 rounded-2xl p-3 flex items-center gap-3"
                          style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#16a34a,#4ade80)' }}>
                            {resolvedEntry.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[var(--ink)] truncate">{resolvedEntry.displayName}</p>
                            <p className="text-[10px] text-[var(--muted)]">
                              @{resolvedEntry.username} · {resolvedEntry.accountNumber}
                            </p>
                            {resolvedEntry.walletAddress
                              ? <p className="mono text-[10px] text-[var(--muted)] truncate">{resolvedEntry.walletAddress.slice(0, 10)}…{resolvedEntry.walletAddress.slice(-6)}</p>
                              : <p className="text-[10px]" style={{ color: 'var(--danger)' }}>No wallet connected</p>
                            }
                          </div>
                          <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        </motion.div>
                      )}
                      {resolveStatus === 'not_found' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="mt-2 text-xs flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                          <AlertCircle size={12} /> No LimePay user found for "{recipient}"
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {recipientError && (
                      <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                        <AlertCircle size={11} /> {recipientError}
                      </p>
                    )}
                    <p className="mt-1.5 text-[10px] text-[var(--subtle)]">{currentMode.hint}</p>
                  </div>
                </div>

                {/* Amount */}
                <div className="glass-card rounded-3xl p-5 relative">
                  <div className="absolute top-0 left-5 right-5 h-0.5 rounded-full spectral-strip" />
                  <label className="block text-xs font-semibold text-[var(--ink-2)] mb-2">Amount</label>
                  <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl glass-inner border-2 transition-fast focus-within:border-[var(--accent)] ${amountError ? 'border-[var(--danger)]' : 'border-transparent'}`}>
                    <span className="text-sm font-bold text-[var(--subtle)]">{currencyPfx}</span>
                    <input type="number" min="0" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setAmountError('') }}
                      placeholder="0.00" className="flex-1 bg-transparent text-lg font-bold text-[var(--ink)] placeholder-[var(--subtle)] outline-none tabular" />
                    <span className="text-sm font-semibold text-[var(--muted)]">{selectedSymbol}</span>
                  </div>
                  {amountError && <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--danger)' }}><AlertCircle size={11} /> {amountError}</p>}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {quickAmounts.map((q) => (
                      <button key={q} onClick={() => setAmount(q)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-fast hover:scale-105 active:scale-95"
                        style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
                        {currencyPfx}{q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <AnimatePresence>
                  {isSuccess && txHash && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="glass-card rounded-3xl p-5 flex items-center gap-3 border-2" style={{ borderColor: 'var(--success)' }}>
                      <Check size={18} style={{ color: 'var(--success)' }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--ink)]">Transfer confirmed!</p>
                        <a href={buildTxExplorerUrl(ARC_CHAIN_ID, txHash)} target="_blank" rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--accent)' }}>
                          View on explorer <ExternalLink size={11} />
                        </a>
                      </div>
                    </motion.div>
                  )}
                  {writeError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="glass-card rounded-3xl p-4 flex items-center gap-3 border-2" style={{ borderColor: 'var(--danger)' }}>
                      <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
                      <p className="text-xs" style={{ color: 'var(--danger)' }}>
                        {writeError.message.includes('user rejected') ? 'Transaction cancelled.' : 'Transaction failed. Try again.'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={handleSend} disabled={isPending || isConfirming}
                  className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200 transition-fast hover:scale-[1.01] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: isWrongChain && isConnected ? '#f59e0b' : 'var(--accent)' }}>
                  {!isConnected ? 'Connect wallet to send'
                    : isWrongChain ? 'Switch to Arc Testnet'
                    : isPending ? <><Spinner /> Confirm in wallet…</>
                    : isConfirming ? <><Spinner /> Confirming…</>
                    : <><ArrowUpRight size={16} /> Send {selectedSymbol}</>}
                </button>
              </motion.div>

            ) : (
              /* ── RECEIVE ── */
              <motion.div key="receive" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">

                {/* LimePay identifiers card */}
                <div className="glass-card rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.18)' }}>
                      <User2 size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--ink)]">Your LimePay IDs</p>
                      <p className="text-xs text-[var(--muted)]">Share these to receive money without a wallet address</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Username */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: 'var(--surface-muted)' }}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74,222,128,0.2)' }}>
                          <AtSign size={14} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Username</p>
                          <p className="font-bold text-[var(--ink)] text-sm">
                            {username ? `@${username}` : <span className="text-[var(--muted)] font-normal text-xs">Set up account to get username</span>}
                          </p>
                        </div>
                      </div>
                      {username && (
                        <button onClick={() => copyToClipboard(`@${username}`, 'username')}
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-fast hover:scale-[1.03] active:scale-95"
                          style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--accent)' }}>
                          {copied === 'username' ? <Check size={12} /> : <Copy size={12} />}
                          {copied === 'username' ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>

                    {/* Account number */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: 'var(--surface-muted)' }}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14,165,233,0.15)' }}>
                          <Hash size={14} style={{ color: '#0ea5e9' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Account Number</p>
                          <p className="font-bold text-[var(--ink)] text-sm mono">
                            {accountNumber ?? <span className="text-[var(--muted)] font-normal text-xs">Set up account to get account number</span>}
                          </p>
                        </div>
                      </div>
                      {accountNumber && (
                        <button onClick={() => copyToClipboard(accountNumber, 'acctno')}
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-fast hover:scale-[1.03] active:scale-95"
                          style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9' }}>
                          {copied === 'acctno' ? <Check size={12} /> : <Copy size={12} />}
                          {copied === 'acctno' ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Wallet address */}
                {isConnected && address ? (
                  <div className="glass-card rounded-3xl p-6 text-center">
                    <div className="w-40 h-40 mx-auto rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--surface-muted)' }}>
                      <div className="text-center">
                        <QrCode size={48} style={{ color: 'var(--muted)' }} className="mx-auto mb-1" />
                        <p className="text-[10px] text-[var(--subtle)]">QR (coming soon)</p>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--muted)] mb-2">Wallet address (Arc Testnet)</p>
                    <div className="glass-inner rounded-2xl px-4 py-3 mb-4">
                      <p className="mono text-xs text-[var(--ink)] break-all">{address}</p>
                    </div>
                    <button onClick={() => copyToClipboard(address, 'wallet')}
                      className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl font-semibold text-sm transition-fast hover:scale-[1.02] active:scale-95"
                      style={{ background: 'var(--accent)', color: 'white' }}>
                      {copied === 'wallet' ? <Check size={15} /> : <Copy size={15} />}
                      {copied === 'wallet' ? 'Copied!' : 'Copy Wallet Address'}
                    </button>
                  </div>
                ) : (
                  <div className="glass-card rounded-3xl p-8 text-center">
                    <Wallet size={32} className="mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                    <p className="text-sm font-medium text-[var(--ink-2)]">Connect your wallet</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Connect to also share your wallet address</p>
                  </div>
                )}

                {/* Supported tokens */}
                <div className="glass-card rounded-3xl p-5">
                  <p className="text-xs font-semibold text-[var(--ink-2)] mb-3">Supported assets</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ASSETS.map((a) => (
                      <div key={a.symbol} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0" style={{ background: a.color }}>
                          {a.symbol === 'cirBTC' ? 'BTC' : a.symbol.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--ink)] truncate">{a.symbol}</p>
                          <p className="text-[10px] text-[var(--muted)] truncate">{a.source === 'live' ? 'Live' : 'Indicative'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-4 flex items-start gap-3 border" style={{ borderColor: 'rgba(74,222,128,0.35)' }}>
                  <AlertCircle size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Only send Arc Testnet tokens to this address. Your username and account number only work within LimePay on this device in demo mode.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
}
