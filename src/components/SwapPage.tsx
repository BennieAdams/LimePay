import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowUpDown, ChevronDown, AlertCircle, Check,
  RefreshCw, ExternalLink, Info, Shield,
} from 'lucide-react'
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, parseUnits } from 'viem'
import { toast } from 'sonner'
import { ASSETS, ASSET_MAP, getSwapRate } from '../assets-config'
import { getUsdc, buildTxExplorerUrl } from '@/onchain-facts'
import { useTxStore } from '../tx-store'
import type { Page } from '../App'

const ARC_CHAIN_ID = 5042002
type SwapStatus = 'idle' | 'approving' | 'confirming' | 'pending' | 'success' | 'error'

// USDC swap router placeholder — on testnet we simulate all non-USDC swaps
// Only USDC→EURC and USDC-native transfers use the real wallet
const USDC_ADDRESS = () => getUsdc(ARC_CHAIN_ID)?.address as `0x${string}` | undefined

interface Props { navigate: (page: Page) => void }

export default function SwapPage({ navigate }: Props) {
  const { isConnected, chainId, address } = useAccount()
  const { switchChain } = useSwitchChain()
  const { addTx, updateTx } = useTxStore()

  const swappable = ASSETS.filter((a) => a.swappable)
  const [fromSymbol, setFromSymbol] = useState('USDC')
  const [toSymbol, setToSymbol] = useState('EURC')
  const [fromAmount, setFromAmount] = useState('')
  const [rateKey, setRateKey] = useState(0)
  const [rateLoading, setRateLoading] = useState(false)
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)
  const [swapStatus, setSwapStatus] = useState<SwapStatus>('idle')
  const [slippage, setSlippage] = useState('0.5')
  const [lastTxId, setLastTxId] = useState<string | null>(null)

  const isWrongChain = chainId !== ARC_CHAIN_ID
  const fromAsset = ASSET_MAP[fromSymbol]
  const toAsset = ASSET_MAP[toSymbol]
  const rate = getSwapRate(fromSymbol, toSymbol)

  // Real wagmi write for USDC (the only live ERC-20 on Arc testnet)
  const { writeContract, data: txHash, isPending: walletPending, error: writeError, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  // Simulated rate-fetch animation
  useEffect(() => {
    if (fromSymbol === toSymbol) return
    setRateLoading(true)
    const t = setTimeout(() => setRateLoading(false), 550)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateKey])

  // Watch for real on-chain confirmation
  useEffect(() => {
    if (txConfirmed && txHash && lastTxId) {
      updateTx(lastTxId, { status: 'confirmed', hash: txHash })
      setSwapStatus('success')
      toast.success(`Swap confirmed on-chain!`)
    }
  }, [txConfirmed, txHash, lastTxId, updateTx])

  // Watch for wallet errors
  useEffect(() => {
    if (writeError && lastTxId) {
      updateTx(lastTxId, { status: 'failed' })
      setSwapStatus('error')
      toast.error(writeError.message.includes('rejected') ? 'Swap cancelled.' : 'Swap failed.')
    }
  }, [writeError, lastTxId, updateTx])

  const toAmount = useMemo(() => {
    if (!fromAmount || !rate || isNaN(parseFloat(fromAmount))) return ''
    const r = parseFloat(fromAmount) * rate
    return toAsset.decimals >= 8 ? r.toFixed(8) : r.toFixed(4)
  }, [fromAmount, rate, toAsset.decimals])

  const flip = () => {
    const pf = fromSymbol, pt = toSymbol
    setFromSymbol(pt); setToSymbol(pf)
    setFromAmount(toAmount)
    setRateKey((k) => k + 1)
  }

  const selectFrom = (sym: string) => {
    if (sym === toSymbol) setToSymbol(fromSymbol)
    setFromSymbol(sym); setFromAmount(''); setShowFromPicker(false); setRateKey((k) => k + 1)
  }
  const selectTo = (sym: string) => {
    if (sym === fromSymbol) setFromSymbol(toSymbol)
    setToSymbol(sym); setFromAmount(''); setShowToPicker(false); setRateKey((k) => k + 1)
  }

  const handleSwap = async () => {
    if (!isConnected) { toast.error('Connect your wallet to swap'); return }
    if (!fromAmount || parseFloat(fromAmount) <= 0) { toast.error('Enter an amount'); return }
    if (fromSymbol === toSymbol) { toast.error('Select different assets'); return }
    if (isWrongChain) { switchChain({ chainId: ARC_CHAIN_ID }); return }

    resetWrite()

    // Record the tx immediately as pending
    const txId = addTx({
      type: 'swap',
      asset: fromSymbol,
      amount: fromAmount,
      toAsset: toSymbol,
      toAmount,
      status: 'pending',
      note: `${fromSymbol} → ${toSymbol} indicative swap`,
    })
    setLastTxId(txId)

    // If swapping FROM USDC we can do a real ERC-20 transfer to a burn/escrow address
    // to demonstrate real wallet approval flow. Other pairs are indicative only.
    const usdcAddress = USDC_ADDRESS()
    const isRealSwap = fromSymbol === 'USDC' && usdcAddress && address

    if (isRealSwap) {
      try {
        setSwapStatus('approving')
        const amt = parseUnits(fromAmount, 6)
        // Send USDC to self as a demo swap (real DEX integration would go here)
        writeContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [address, amt],
          chainId: ARC_CHAIN_ID,
        })
        setSwapStatus('confirming')
      } catch (e: unknown) {
        updateTx(txId, { status: 'failed' })
        setSwapStatus('error')
        toast.error(e instanceof Error ? e.message : 'Swap failed')
      }
    } else {
      // Indicative swap simulation for non-live assets
      setSwapStatus('confirming')
      await new Promise((r) => setTimeout(r, 900))
      setSwapStatus('pending')
      await new Promise((r) => setTimeout(r, 1500))
      updateTx(txId, { status: 'confirmed' })
      setSwapStatus('success')
      toast.success(`Swap submitted: ${fromAmount} ${fromSymbol} → ${toAmount} ${toSymbol}`)
    }
  }

  const canSwap = fromSymbol !== toSymbol && !!fromAmount && parseFloat(fromAmount) > 0
  const fee = fromAmount ? (parseFloat(fromAmount) * 0.003).toFixed(4) : null
  const minReceive = toAmount
    ? (parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(toAsset.decimals >= 8 ? 8 : 4)
    : null
  const needsBridgeNote = fromAsset.source === 'bridge' || toAsset.source === 'bridge'
    || fromAsset.source === 'onramp' || toAsset.source === 'onramp'
  const isBusy = walletPending || isConfirming || swapStatus === 'approving' || swapStatus === 'confirming' || swapStatus === 'pending'

  return (
    <div className="min-h-dvh relative" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.22) 0%, transparent 70%)', filter: 'blur(55px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(132,204,22,0.18) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-5 md:px-10 pt-6 pb-4">
        <button onClick={() => navigate('dashboard')} className="w-10 h-10 rounded-xl flex items-center justify-center glass-card transition-fast hover:scale-95" aria-label="Back">
          <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <h1 className="display text-xl font-bold text-[var(--ink)]">Swap</h1>
          <p className="text-xs text-[var(--muted)]">Exchange between 8 assets</p>
        </div>
      </div>

      <div className="relative z-10 px-5 md:px-0 pb-24 md:pb-10 md:flex md:justify-center">
        <div className="w-full md:max-w-lg space-y-4">

          {/* Wallet warning */}
          {!isConnected && (
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3 border" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
              <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
              <p className="text-xs text-[var(--ink)]">Connect your wallet to sign swap transactions.</p>
            </div>
          )}

          {/* Main swap card */}
          <div className="glass-card rounded-3xl p-6 relative">
            <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full spectral-strip" />

            {/* Rate badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-[var(--ink-2)]">Exchange</span>
              {rateLoading ? (
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <RefreshCw size={11} className="animate-spin" /> Fetching rate…
                </div>
              ) : rate ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tabular" style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--accent)' }}>
                  1 {fromSymbol} ≈ {rate < 0.001 ? rate.toExponential(3) : rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toSymbol}
                  <span className="text-[9px] font-normal text-[var(--muted)]">indicative</span>
                </div>
              ) : null}
            </div>

            {/* FROM */}
            <div className="glass-inner rounded-2xl p-4 mb-2 relative">
              <span className="text-xs text-[var(--muted)] font-medium block mb-2">From</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowFromPicker((v) => !v); setShowToPicker(false) }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm text-white transition-fast hover:opacity-90 flex-shrink-0"
                  style={{ background: fromAsset.color }}
                >
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                  {fromSymbol}
                  <ChevronDown size={13} />
                </button>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-2xl font-bold text-[var(--ink)] placeholder-[var(--subtle)] outline-none tabular text-right"
                />
              </div>
              <AnimatePresence>
                {showFromPicker && (
                  <AssetPicker assets={swappable} current={fromSymbol} onSelect={selectFrom} />
                )}
              </AnimatePresence>
            </div>

            {/* Flip */}
            <div className="flex justify-center my-2">
              <button onClick={flip} className="w-10 h-10 rounded-full flex items-center justify-center glass-card shadow-md transition-fast hover:scale-105 active:scale-90" aria-label="Flip">
                <ArrowUpDown size={16} style={{ color: 'var(--accent)' }} />
              </button>
            </div>

            {/* TO */}
            <div className="glass-inner rounded-2xl p-4 relative">
              <span className="text-xs text-[var(--muted)] font-medium block mb-2">To (estimated)</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowToPicker((v) => !v); setShowFromPicker(false) }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm text-white transition-fast hover:opacity-90 flex-shrink-0"
                  style={{ background: toAsset.color }}
                >
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                  {toSymbol}
                  <ChevronDown size={13} />
                </button>
                <div className="flex-1 text-2xl font-bold text-right tabular" style={{ color: toAmount ? 'var(--ink)' : 'var(--subtle)' }}>
                  {rateLoading && fromAmount
                    ? <span className="w-5 h-5 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin inline-block" />
                    : (toAmount || '0.00')}
                </div>
              </div>
              <AnimatePresence>
                {showToPicker && (
                  <AssetPicker assets={swappable} current={toSymbol} onSelect={selectTo} />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Slippage */}
          <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <Info size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <span className="text-xs text-[var(--muted)] flex-1">Slippage tolerance</span>
            <div className="flex gap-1.5">
              {['0.1', '0.5', '1.0'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-fast"
                  style={slippage === s ? { background: 'var(--accent)', color: 'white' } : { background: 'var(--surface-muted)', color: 'var(--muted)' }}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Preview rows */}
          <AnimatePresence>
            {canSwap && !rateLoading && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card rounded-2xl p-4 space-y-2.5 overflow-hidden">
                <PreviewRow label="Rate" value={`1 ${fromSymbol} ≈ ${rate?.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${toSymbol}`} />
                {fee && <PreviewRow label="Protocol Fee (0.3%)" value={`${fee} ${fromSymbol}`} />}
                <PreviewRow label="Price Impact" value="< 0.05%" accent />
                <PreviewRow label="Slippage Tolerance" value={`${slippage}%`} />
                <PreviewRow label="Network" value="Arc Testnet" />
                <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <PreviewRow label="You receive (min.)" value={`${minReceive} ${toSymbol}`} bold />
                </div>
                {fromSymbol === 'USDC' && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Shield size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span className="text-[10px] text-[var(--muted)]">USDC swap triggers a real wallet approval on Arc Testnet</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bridge note */}
          {needsBridgeNote && canSwap && (
            <div className="rounded-2xl p-4 flex items-start gap-2" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)' }}>
              <Info size={13} style={{ color: '#0369a1', marginTop: 2, flexShrink: 0 }} />
              <p className="text-xs leading-relaxed" style={{ color: '#0c4a6e' }}>
                One or more selected assets use a bridged/indicative representation. For cross-chain movement use the <button onClick={() => navigate('bridge')} className="underline font-semibold">Bridge</button> feature.
              </p>
            </div>
          )}

          {/* Status banners */}
          <AnimatePresence>
            {swapStatus === 'success' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-3xl p-5 flex items-center gap-3 border-2" style={{ borderColor: 'var(--success)' }}>
                <Check size={20} style={{ color: 'var(--success)' }} />
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Swap submitted!</p>
                  <p className="text-xs text-[var(--muted)]">{fromAmount} {fromSymbol} → {toAmount} {toSymbol}</p>
                  {txHash && (
                    <a href={buildTxExplorerUrl(ARC_CHAIN_ID, txHash)} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--accent)' }}>
                      View on explorer <ExternalLink size={11} />
                    </a>
                  )}
                  <button onClick={() => navigate('history')} className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--accent)' }}>
                    View in history →
                  </button>
                </div>
              </motion.div>
            )}
            {swapStatus === 'error' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-4 flex items-center gap-3 border-2" style={{ borderColor: 'var(--danger)' }}>
                <AlertCircle size={16} style={{ color: 'var(--danger)' }} />
                <p className="text-xs text-[var(--danger)]">Swap failed or was cancelled. Please try again.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Swap button */}
          <button
            onClick={() => { void handleSwap() }}
            disabled={!canSwap || isBusy}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200 transition-fast hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: !isConnected || isWrongChain ? '#f59e0b' : 'var(--accent)' }}
          >
            {!isConnected ? 'Connect wallet to swap'
              : isWrongChain ? 'Switch to Arc Testnet'
              : swapStatus === 'approving' ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Waiting for wallet approval…</>
              : walletPending ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Confirm in wallet…</>
              : isConfirming || swapStatus === 'pending' ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processing swap…</>
              : <><RefreshCw size={16} /> Swap {fromSymbol} → {toSymbol}</>
            }
          </button>

          {/* Disclaimer */}
          <div className="rounded-2xl p-4 flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <AlertCircle size={13} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
              Rates are indicative only. USDC swaps trigger a real wallet signature on Arc Testnet. All other swaps are simulated demos. No real funds at risk except USDC on testnet.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssetPicker({ assets, current, onSelect }: { assets: typeof ASSETS; current: string; onSelect: (s: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="absolute left-0 right-0 mt-2 z-30 rounded-2xl shadow-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid var(--border)', top: '100%', maxHeight: 280, overflowY: 'auto' }}
    >
      {assets.map((a) => (
        <button
          key={a.symbol}
          onClick={() => onSelect(a.symbol)}
          className="w-full flex items-center gap-3 px-4 py-3 transition-fast hover:bg-green-50 text-left"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: a.color }}>
            {a.symbol === 'cirBTC' ? 'BTC' : a.symbol.slice(0, 3)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[var(--ink)]">{a.symbol}</div>
            <div className="text-xs text-[var(--muted)]">{a.name}</div>
          </div>
          {a.symbol === current && <Check size={14} style={{ color: 'var(--accent)' }} />}
        </button>
      ))}
    </motion.div>
  )
}

function PreviewRow({ label, value, accent, bold }: { label: string; value: string; accent?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className={`text-xs tabular ${bold ? 'font-bold' : 'font-medium'}`} style={{ color: accent ? 'var(--success)' : 'var(--ink)' }}>
        {value}
      </span>
    </div>
  )
}
