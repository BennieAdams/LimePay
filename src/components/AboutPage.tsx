import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, Shield, RefreshCw, TrendingUp, Landmark, Receipt, CreditCard, GitMerge, ArrowUpDown, ExternalLink } from 'lucide-react'
import type { Page } from '../App'

interface Props { navigate: (page: Page) => void }

const VERSION = '1.0.0'
const BUILT_ON = 'Arc Testnet · Circle Infrastructure'

const FEATURES = [
  { icon: ArrowUpDown,  color: '#16a34a', title: 'Send & Receive',    desc: 'Transfer USDC and other supported assets to any wallet address globally, instantly and with low fees on Arc Testnet.' },
  { icon: RefreshCw,    color: '#f59e0b', title: 'Swap',              desc: 'Exchange between 8 assets — USDC, EURC, cirBTC, ETH, BTC, NGN, MOVE, APT — using indicative live rates.' },
  { icon: GitMerge,     color: '#d97706', title: 'Bridge (CCTP)',     desc: 'Move USDC across 7 chains using Circle\'s Cross-Chain Transfer Protocol. No wrapped tokens, no liquidity risk.' },
  { icon: TrendingUp,   color: '#8b5cf6', title: 'Earn',              desc: 'Deposit USDC, EURC, or cirBTC to earn yield through Circle Yield and Arc Lending protocols.' },
  { icon: Landmark,     color: '#0ea5e9', title: 'Borrow',            desc: 'Use cirBTC, ETH, or BTC as collateral to borrow USDC or EURC with transparent LTV ratios and rates.' },
  { icon: Receipt,      color: '#dc2626', title: 'Bill Payments',     desc: 'Pay airtime, data, electricity, cable TV, and betting accounts directly from your crypto wallet.' },
  { icon: CreditCard,   color: '#7c3aed', title: 'Buy Crypto',        desc: 'Purchase USDC, EURC, or cirBTC with a debit or credit card via the integrated fiat on-ramp.' },
  { icon: Shield,       color: '#16a34a', title: 'Non-Custodial',     desc: 'LimePay never holds your keys. Connect MetaMask, Coinbase Wallet, or any WalletConnect-compatible wallet.' },
]

const ASSETS = [
  { symbol: 'USDC',   color: '#2775CA', desc: 'USD Coin — Circle\'s dollar stablecoin. Live on Arc Testnet.' },
  { symbol: 'EURC',   color: '#003087', desc: 'Euro Coin — Circle\'s euro stablecoin. Indicative on Arc Testnet.' },
  { symbol: 'cirBTC', color: '#F7931A', desc: 'Circle wrapped BTC. Indicative on Arc Testnet.' },
  { symbol: 'ETH',    color: '#627EEA', desc: 'Ethereum — bridged wrapped representation.' },
  { symbol: 'BTC',    color: '#F7931A', desc: 'Bitcoin — bridged wrapped representation.' },
  { symbol: 'NGN',    color: '#008751', desc: 'Nigerian Naira — fiat on-ramp representation.' },
  { symbol: 'MOVE',   color: '#7C3AED', desc: 'Movement token — bridged representation.' },
  { symbol: 'APT',    color: '#2DD4BF', desc: 'Aptos token — bridged representation.' },
]

const CHAINS = [
  'Arc Testnet (default)',
  'Ethereum Sepolia',
  'Base Sepolia',
  'Arbitrum Sepolia',
  'Polygon Amoy',
  'Avalanche Fuji',
  'Solana Devnet',
]

const FAQS = [
  {
    q: 'Is LimePay custodial?',
    a: 'No. LimePay is fully non-custodial. Your private keys never leave your wallet. LimePay interacts with your wallet to request transaction signatures — it cannot move funds without your explicit approval.',
  },
  {
    q: 'What network does LimePay run on?',
    a: 'LimePay defaults to Arc Testnet — Circle\'s blockchain where USDC is the native gas token. This means all gas fees are paid in USDC, not a separate token. Bridging extends coverage to 6 additional testnets via CCTP.',
  },
  {
    q: 'Are my funds real?',
    a: 'LimePay runs on testnet. All balances, transfers, and swaps are on test networks with no real monetary value. This is a demo/development environment. Mainnet support requires additional configuration.',
  },
  {
    q: 'How does the Swap work?',
    a: 'For USDC (the live asset on Arc Testnet), swaps execute real on-chain ERC-20 transfers and require wallet approval. For other assets the rates are indicative only and the swap is simulated — full DEX integration is planned.',
  },
  {
    q: 'How does Bridge work?',
    a: 'Bridging uses Circle\'s Cross-Chain Transfer Protocol (CCTP). USDC is burned on the source chain, a Circle attestation is generated, and USDC is minted on the destination chain. No wrapped tokens or liquidity pools are involved.',
  },
  {
    q: 'What are indicative balances?',
    a: 'Only USDC has a live on-chain balance read from Arc Testnet. All other assets (EURC, cirBTC, ETH, BTC, NGN, MOVE, APT) show indicative zero balances because their contracts are not yet registered in the Arc Testnet registry. Full support requires Circle adding those contracts to the chain registry.',
  },
  {
    q: 'How do I get test USDC?',
    a: 'Click "Get test USDC" in the Arc Studio sidebar to drip free Arc Testnet USDC to your connected wallet. You can also visit faucet.circle.com for additional testnet tokens.',
  },
]

export default function AboutPage({ navigate }: Props) {
  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #f7fee7 100%)' }}>
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-6 pb-24 md:pb-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('settings')} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center transition-fast hover:scale-95" aria-label="Back">
            <ArrowLeft size={18} style={{ color: 'var(--ink)' }} />
          </button>
          <div>
            <h1 className="display text-2xl font-bold text-[var(--ink)]">About LimePay</h1>
            <p className="text-xs text-[var(--muted)]">v{VERSION} · {BUILT_ON}</p>
          </div>
        </div>

        {/* Hero card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="rounded-3xl p-8 mb-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #16a34a 0%, #4ade80 80%, #a3e635 100%)' }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', filter: 'blur(40px)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.25)' }}>
                <span className="text-white font-black text-xl display">L</span>
              </div>
              <div>
                <div className="display text-2xl font-bold text-white">LimePay</div>
                <div className="text-white/70 text-xs">Powered by Circle · Arc Testnet</div>
              </div>
            </div>
            <p className="text-white/90 text-sm leading-relaxed">
              LimePay is a next-generation crypto-native fintech app inspired by Nigerian mobile money platforms.
              It combines the familiar UX of services like Remita with Circle's programmable money infrastructure —
              USDC as gas, CCTP bridging, and Arc's sub-second finality — to make stablecoin payments as easy
              as sending a text message.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {['USDC Native', 'Non-Custodial', 'Arc Testnet', 'CCTP Bridge', 'Circle Yield'].map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.22)' }}>{tag}</span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Features grid */}
        <Section title="Features">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, color, title, desc }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="glass-card rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <p className="font-semibold text-[var(--ink)] text-sm mb-0.5">{title}</p>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Supported assets */}
        <Section title="Supported Assets">
          <div className="space-y-2">
            {ASSETS.map(({ symbol, color, desc }) => (
              <div key={symbol} className="glass-card rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: color }}>
                  {symbol.slice(0, 3)}
                </div>
                <div>
                  <p className="font-semibold text-[var(--ink)] text-sm">{symbol}</p>
                  <p className="text-xs text-[var(--muted)]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Supported chains */}
        <Section title="Supported Chains">
          <div className="glass-card rounded-2xl p-4">
            <div className="flex flex-wrap gap-2">
              {CHAINS.map((chain) => (
                <span key={chain} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: chain.includes('default') ? 'rgba(74,222,128,0.18)' : 'rgba(15,34,24,0.07)', color: chain.includes('default') ? 'var(--accent)' : 'var(--ink-2)' }}>
                  {chain}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* Architecture */}
        <Section title="Technical Architecture">
          <div className="glass-card rounded-2xl p-5 space-y-3">
            {[
              { label: 'Frontend',      value: 'React 18 + TypeScript + Vite · Tailwind CSS · Framer Motion' },
              { label: 'Wallet',        value: 'wagmi v2 + ConnectKit · MetaMask · WalletConnect · Coinbase Wallet' },
              { label: 'Chain reads',   value: 'viem · eth_call via Arc Testnet RPC · erc20Abi balanceOf' },
              { label: 'Stablecoin',    value: 'USDC (Circle) — native gas + ERC-20 on Arc Testnet' },
              { label: 'Bridging',      value: 'Circle CCTP v2 — burn-and-mint across 7 chains' },
              { label: 'Yield',         value: 'Circle Yield + Arc Lending protocols (indicative on testnet)' },
              { label: 'TX history',    value: 'React Context + localStorage — persists across sessions' },
              { label: 'Auth',          value: 'Email + password (mock) + wallet connect — session in localStorage' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-xs font-bold text-[var(--muted)] w-28 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-xs text-[var(--ink)] leading-relaxed">{value}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section title="Frequently Asked Questions">
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <FAQItem key={q} question={q} answer={a} />
            ))}
          </div>
        </Section>

        {/* Links */}
        <Section title="Resources">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Circle Docs',     url: 'https://developers.circle.com' },
              { label: 'Arc Docs',        url: 'https://docs.arc.io' },
              { label: 'CCTP Docs',       url: 'https://developers.circle.com/stablecoins/cctp-getting-started' },
              { label: 'Arc Explorer',    url: 'https://explorer.testnet.arc.io' },
              { label: 'Circle Faucet',   url: 'https://faucet.circle.com' },
              { label: 'Arc Studio',      url: 'https://studio.arc.io' },
            ].map(({ label, url }) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                className="glass-card rounded-2xl p-4 flex items-center justify-between transition-fast hover:scale-[1.02] active:scale-95">
                <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
                <ExternalLink size={14} style={{ color: 'var(--accent)' }} />
              </a>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>
              <span className="text-white font-black text-[10px] display">L</span>
            </div>
            <span className="display text-base font-bold text-[var(--ink)]">Lime<span style={{ color: 'var(--accent)' }}>Pay</span></span>
          </div>
          <p className="text-xs text-[var(--muted)]">v{VERSION} · Built with Circle &amp; Arc · Testnet only</p>
          <p className="text-xs text-[var(--subtle)] mt-1">© 2026 LimePay. All rights reserved.</p>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }} className="mb-6">
      <h2 className="display text-base font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
        <Zap size={14} style={{ color: 'var(--accent)' }} />
        {title}
      </h2>
      {children}
    </motion.div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-start justify-between p-4 text-left gap-3">
        <span className="font-semibold text-[var(--ink)] text-sm leading-snug">{question}</span>
        <span className="text-[var(--accent)] font-bold text-lg flex-shrink-0 leading-none mt-0.5">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3">
          {answer}
        </div>
      )}
    </div>
  )
}


