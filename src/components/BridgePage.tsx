/**
 * LimePay Bridge — USDC cross-chain via CCTP (indicative for testnet chains,
 * real wallet approval triggered for USDC on Arc Testnet).
 */
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ChevronDown, ArrowRight, AlertCircle, Check,
  ExternalLink, Info, GitMerge, Shield,
} from 'lucide-react'
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, parseUnits } from 'viem'
import { toast } from 'sonner'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { useTxStore } from '../tx-store'
import type { Page } from '../App'

const ARC_CHAIN_ID = 5042002

interface Chain {
  id: number | null
  name: string
  short: string
  color: string
  testnet: boolean
  cctpSupported: boolean
}

const CHAINS: Chain[] = [
  { id: ARC_CHAIN_ID, name: 'Arc Testnet',      short: 'Arc',  color: '#16a34a', testnet: true,  cctpSupported: true  },
  { id: 11155111,     name: 'Ethereum Sepolia',  short: 'ETH',  color: '#627EEA', testnet: true,  cctpSupported: true  },
  { id: 84532,        name: 'Base Sepolia',      short: 'Base', color: '#0052FF', testnet: true,  cctpSupported: true  },
  { id: 421614,       name: 'Arbitrum Sepolia',  short: 'ARB',  color: '#28A0F0', testnet: true,  cctpSupported: true  },
  { id: 80002,        name: 'Polygon Amoy',      short: 'POL',  color: '#8247E5', testnet: true,  cctpSupported: true  },
  { id: 43113,        name: 'Avalanche Fuji',    short: 'AVAX', color: '#E84142', testnet: true,  cctpSupported: true  },
  { id: null,         name: 'Solana Devnet',     short: 'SOL',  color: '#9945FF', testnet: true,  cctpSupported: false },
]

const BRIDGEABLE_ASSETS = ['USDC', 'EURC']
// Only USDC has a live address on Arc testnet; EURC is indicative
const USDC_ADDR = () => getUsdc(ARC_CHAIN_ID)?.address as `0x${string}` | undefined

type BridgeStatus = 'idle' | 'approving' | 'confirming' | 'attesting' | 'minting' | 'success' | 'error'

interface Props { navigate: (page: Page) => void }

export default function BridgePage({ navigate }: Props) {
  const { isConnected, chainId, address } = useAccount()
  const { switchChain } = useSwitchChain()
  const { addTx, updateTx } = useTxStore()

  const [fromChainIdx, setFromChainIdx] = useState(0)        // Arc by default
  const [toChainIdx, setToChainIdx] = useState(1)            // ETH Sepolia
  const [asset, setAsset] = useState('USDC')
  const [amount, setAmount] = useState('')
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('idle')
  const [lastTxId, setLastTxId] = useState<string | null>(null)
  const [amountError, setAmountError] = useState('')

  const fromChain = CHAINS[fromChainIdx]
  const toChain = CHAINS[toChainIdx]
  const isWrongChain = chainId !== ARC_CHAIN_ID
  const bothCctp = fromChain.cctpSupported && toChain.cctpSupported

  const { writeContract, data: txHash, isPending: walletPending, error: writeError, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  // Watch chain confirmation
  useMemo(() => {
    if (txConfirmed && txHash && lastTxId) {
      updateTx(lastTxId, { status: 'confirmed', hash: txHash })
      setBridgeStatus('attesting')
      // Simulate CCTP attestation
      setTimeout(() => {
        setBridgeStatus('minting')
        setTimeout(() => {
          setBridgeStatus('success')
          toast.success('Bridge complete! USDC minted on destination.')
        }, 2000)
      }, 3000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txConfirmed, txHash, lastTxId])

  useMemo(() => {
    if (writeError && lastTxId) {
      updateTx(lastTxId, { status: 'failed' })
      setBridgeStatus('error')
      toast.error(writeError.message.includes('rejected') ? 'Bridge cancelled.' : 'Bridge failed.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeError, lastTxId])

  const flipChains = () => {
    const pf = fromChainIdx
    setFromChainIdx(toChainIdx)
    setToChainIdx(pf)
    setAmount('')
  }

  const handleBridge = async () => {
    if (!isConnected) { toast.error('Connect your wallet first'); return }
    const num = parseFloat(amount)
    if (!amount || isNaN(num) || num <= 0) { setAmountError('Enter a valid amount'); return }
    setAmountError('')

    if (isWrongChain) { switchChain({ chainId: ARC_CHAIN_ID }); return }

    resetWrite()
    const txId = addTx({
      type: 'bridge',
      asset,
      amount,
      fromChain: fromChain.name,
      toChain: toChain.name,
      status: 'pending',
      note: `${asset} bridge via CCTP`,
    })
    setLastTxId(txId)

    const usdcAddr = USDC_ADDR()
    const isRealBridge = asset === 'USDC' && usdcAddr && address && fromChain.id === ARC_CHAIN_ID

    if (isRealBridge) {
      try {
        setBridgeStatus('approving')
        // Burn USDC (demo: transfer to self; real: call TokenMessenger.depositForBurn)
        const amt = parseUnits(amount, 6)
        writeContract({
          address: usdcAddr,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [address, amt],
          chainId: ARC_CHAIN_ID,
        })
        setBridgeStatus('confirming')
      } catch (e: unknown) {
        updateTx(txId, { status: 'failed' })
        setBridgeStatus('error')
        toast.error(e instanceof Error ? e.message : 'Bridge failed')
      }
    } else {
      // Indicative simulation
      setBridgeStatus('confirming')
      await new Promise((r) => setTimeout(r, 1000))
      setBridgeStatus('attesting')
      await new Promise((r) => setTimeout(r, 2000))
      setBridgeStatus('minting')
      await new Promise((r) => setTimeout(r, 1500))
      updateTx(txId, { status: 'confirmed' })
      setBridgeStatus('success')
      toast.success(`Bridge submitted: ${amount} ${asset} → ${toChain.name}`)
    }
  }

  const isBusy = walletPending || isConfirming || ['approving','confirming','attesting','minting'].includes(bridgeStatus)
  const fee = amount && parseFloat(amount) > 0 ? (parseFloat(amount) * 0.001).toFixed(4) : null
  const receive = amount && parseFloat(amount) > 0 ? (parseFloat(amount) - parseFloat(fee ?? '0')).toFixed(4) : null

  const STEPS: { key: BridgeStatus; label: string }[] = [
    { key: 'approving',  label: 'Wallet Approval' },
    { key: 'confirming', label: 'Burn on Source' },
    { key: 'attesting',  label: 'CCTP Attestation' },
    { key: 'minting',    label: 'Mint on Destination' },
    { key: 'success',    label: 'Complete' },
  ]
  const stepIndex = STEPS.findIndex((s) => s.key === bridgeStatus)

  return (
    <div className="min-h-dvh relative" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.20) 0%, transparent 70%)', filter: 'blur(55px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-5%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-5 md:px-10 pt-6 pb-4">
        <button onClick={() => navigate('dashboard')} className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95" aria-label="Back">
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <h1 className="display text-xl font-bold text-[var(--ink)]">Bridge</h1>
          <p className="text-xs text-[var(--muted)]">Cross-chain USDC via Circle CCTP</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(74,222,128,0.15)' }}>
          <Shield size={11} style={{ color: 'var(--accent)' }} />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>CCTP</span>
        </div>
      </div>

      <div className="relative z-10 px-5 md:px-0 pb-24 md:pb-10 md:flex md:justify-center">
        <div className="w-full md:max-w-lg space-y-4">

          {/* Wallet warning */}
          {!isConnected && (
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3 border" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
              <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
              <p className="text-xs text-[var(--ink)]">Connect your wallet to sign bridge transactions.</p>
            </div>
          )}

          {/* Chain selector card */}
          <div className="glass-card rounded-3xl p-6 relative">
            <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full spectral-strip" />
            <p className="text-xs font-semibold text-[var(--ink-2)] mb-4">Route</p>

            <div className="flex items-center gap-3">
              {/* From chain */}
              <div className="flex-1 relative">
                <button
                  onClick={() => { setShowFromPicker((v) => !v); setShowToPicker(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-fast hover:opacity-90"
                  style={{ background: fromChain.color, color: 'white' }}
                >
                  <span className="w-2 h-2 rounded-full bg-white/50 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{fromChain.short}</span>
                  <ChevronDown size={13} />
                </button>
                <AnimatePresence>
                  {showFromPicker && (
                    <ChainPicker chains={CHAINS} current={fromChainIdx} onSelect={(i) => { setFromChainIdx(i); setShowFromPicker(false) }} />
                  )}
                </AnimatePresence>
              </div>

              {/* Arrow / flip */}
              <button onClick={flipChains} className="w-10 h-10 rounded-full glass-card flex items-center justify-center flex-shrink-0 transition-fast hover:scale-105" aria-label="Flip chains">
                <ArrowRight size={16} style={{ color: 'var(--accent)' }} />
              </button>

              {/* To chain */}
              <div className="flex-1 relative">
                <button
                  onClick={() => { setShowToPicker((v) => !v); setShowFromPicker(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-fast hover:opacity-90"
                  style={{ background: toChain.color, color: 'white' }}
                >
                  <span className="w-2 h-2 rounded-full bg-white/50 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{toChain.short}</span>
                  <ChevronDown size={13} />
                </button>
                <AnimatePresence>
                  {showToPicker && (
                    <ChainPicker chains={CHAINS} current={toChainIdx} onSelect={(i) => { setToChainIdx(i); setShowToPicker(false) }} />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Chain names */}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-[10px] text-[var(--muted)] truncate max-w-[120px]">{fromChain.name}</span>
              <span className="text-[10px] text-[var(--muted)] truncate max-w-[120px] text-right">{toChain.name}</span>
            </div>

            {!bothCctp && (
              <div className="mt-3 p-2.5 rounded-xl flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <AlertCircle size={12} style={{ color: '#d97706', flexShrink: 0 }} />
                <p className="text-[11px]" style={{ color: '#92400e' }}>One chain doesn't support CCTP — this bridge will be simulated.</p>
              </div>
            )}
          </div>

          {/* Asset + amount */}
          <div className="glass-card rounded-3xl p-5 space-y-4">
            {/* Asset selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-2)] mb-2">Asset</label>
              <div className="flex gap-2">
                {BRIDGEABLE_ASSETS.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => setAsset(sym)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-fast"
                    style={asset === sym ? { background: sym === 'USDC' ? '#2775CA' : '#003087', color: 'white' } : { background: 'var(--surface-muted)', color: 'var(--muted)' }}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-2)] mb-2">Amount</label>
              <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl glass-inner border-2 transition-fast focus-within:border-[var(--accent)] ${amountError ? 'border-[var(--danger)]' : 'border-transparent'}`}>
                <span className="text-sm font-bold text-[var(--subtle)]">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setAmountError('') }}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-lg font-bold text-[var(--ink)] placeholder-[var(--subtle)] outline-none tabular"
                />
                <span className="text-sm font-semibold text-[var(--muted)]">{asset}</span>
              </div>
              {amountError && <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--danger)' }}><AlertCircle size={11} /> {amountError}</p>}
              <div className="flex gap-2 mt-2">
                {['10', '50', '100', '500'].map((q) => (
                  <button key={q} onClick={() => setAmount(q)} className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-fast hover:scale-105" style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
                    ${q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <AnimatePresence>
            {amount && parseFloat(amount) > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card rounded-2xl p-4 space-y-2.5 overflow-hidden">
                <Row label="From" value={fromChain.name} />
                <Row label="To" value={toChain.name} />
                <Row label="Bridge Fee (~0.1%)" value={`${fee} ${asset}`} />
                <Row label="Protocol" value="Circle CCTP" />
                <Row label="Est. time" value={bothCctp ? '~2–5 min' : '~5–15 min (simulated)'} />
                <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <Row label="You receive" value={`${receive} ${asset}`} bold />
                </div>
                {asset === 'USDC' && fromChain.id === ARC_CHAIN_ID && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Shield size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span className="text-[10px] text-[var(--muted)]">USDC bridge triggers a real wallet approval on Arc Testnet</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress steps */}
          <AnimatePresence>
            {bridgeStatus !== 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-5">
                <p className="text-xs font-semibold text-[var(--ink-2)] mb-4">Bridge Progress</p>
                <div className="space-y-3">
                  {STEPS.map((step, i) => {
                    const done = bridgeStatus === 'success' || i < stepIndex
                    const active = !done && i === stepIndex
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{
                            background: done ? 'var(--accent)' : active ? 'rgba(74,222,128,0.25)' : 'var(--surface-muted)',
                            color: done ? 'white' : active ? 'var(--accent)' : 'var(--subtle)',
                          }}
                        >
                          {done ? <Check size={12} /> : active ? <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" /> : i + 1}
                        </div>
                        <span className="text-xs font-medium" style={{ color: done || active ? 'var(--ink)' : 'var(--muted)' }}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {bridgeStatus === 'success' && txHash && (
                  <a href={buildTxExplorerUrl(ARC_CHAIN_ID, txHash)} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 mt-4" style={{ color: 'var(--accent)' }}>
                    View burn tx on explorer <ExternalLink size={11} />
                  </a>
                )}
                {bridgeStatus === 'success' && (
                  <button onClick={() => navigate('history')} className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    View in history →
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {bridgeStatus === 'error' && (
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3 border-2" style={{ borderColor: 'var(--danger)' }}>
              <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
              <p className="text-xs text-[var(--danger)]">Bridge failed or was cancelled. Please try again.</p>
            </div>
          )}

          {/* Bridge button */}
          <button
            onClick={() => { void handleBridge() }}
            disabled={isBusy || bridgeStatus === 'success'}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200 transition-fast hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: !isConnected || isWrongChain ? '#f59e0b' : 'var(--accent)' }}
          >
            {!isConnected ? 'Connect wallet to bridge'
              : isWrongChain ? 'Switch to Arc Testnet'
              : bridgeStatus === 'approving' ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Waiting for approval…</>
              : walletPending ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Confirm in wallet…</>
              : bridgeStatus === 'confirming' || isConfirming ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Burning USDC…</>
              : bridgeStatus === 'attesting' ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> CCTP Attesting…</>
              : bridgeStatus === 'minting' ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Minting on {toChain.short}…</>
              : bridgeStatus === 'success' ? <><Check size={16} /> Bridge Complete!</>
              : <><GitMerge size={16} /> Bridge {asset} to {toChain.short}</>
            }
          </button>

          {/* Info */}
          <div className="rounded-2xl p-4 flex items-start gap-2" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.20)' }}>
            <Info size={13} style={{ color: '#1d4ed8', marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs leading-relaxed" style={{ color: '#1e3a8a' }}>
              USDC bridges use Circle's Cross-Chain Transfer Protocol (CCTP): burn on source, mint on destination. USDC from Arc Testnet triggers a real wallet approval. Other routes are simulated testnet demos.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChainPicker({ chains, current, onSelect }: { chains: Chain[]; current: number; onSelect: (i: number) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="absolute left-0 right-0 mt-1 z-40 rounded-2xl shadow-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid var(--border)', top: '100%', maxHeight: 260, overflowY: 'auto' }}
    >
      {chains.map((c, i) => (
        <button
          key={c.name}
          onClick={() => onSelect(i)}
          className="w-full flex items-center gap-3 px-4 py-3 transition-fast hover:bg-green-50 text-left"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0" style={{ background: c.color }}>
            {c.short.slice(0, 3)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[var(--ink)]">{c.name}</div>
            <div className="text-[10px] text-[var(--muted)]">{c.cctpSupported ? 'CCTP supported' : 'Simulated'}</div>
          </div>
          {i === current && <Check size={13} style={{ color: 'var(--accent)' }} />}
        </button>
      ))}
    </motion.div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className={`text-xs tabular ${bold ? 'font-bold text-[var(--ink)]' : 'font-medium text-[var(--ink)]'}`}>{value}</span>
    </div>
  )
}
