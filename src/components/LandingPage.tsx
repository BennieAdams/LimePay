import { motion } from 'framer-motion'
import { ArrowRight, Shield, Zap, Globe, ChevronRight } from 'lucide-react'
import { ConnectKitButton } from 'connectkit'

interface LandingPageProps {
  onRegister: () => void
  onLogin: () => void
}

export default function LandingPage({ onRegister, onLogin }: LandingPageProps) {
  return (
    <div
      className="min-h-dvh relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 35%, #f7fee7 70%, #fefce8 100%)' }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          style={{
            position: 'absolute', top: '-5%', right: '-10%', width: 420, height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74,222,128,0.25) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '10%', left: '-5%', width: 360, height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(132,204,22,0.18) 0%, transparent 70%)',
            filter: 'blur(55px)',
          }}
        />
      </div>

      {/* ── DESKTOP NAV ── */}
      <nav className="relative z-20 hidden md:flex items-center justify-between px-8 lg:px-16 py-5">
        <Logo />
        <div className="flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-fast">
            Features
          </a>
          <a href="#assets" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-fast">
            Assets
          </a>
          <a href="#security" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-fast">
            Security
          </a>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border-2 border-[var(--accent)] text-[var(--accent)] hover:bg-green-50 transition-fast"
          >
            Log In
          </button>
          <button
            onClick={onRegister}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-fast shadow-lg shadow-green-200"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── MOBILE HEADER ── */}
      <header className="relative z-20 flex md:hidden items-center justify-between px-5 pt-6 pb-2">
        <Logo />
        <button
          onClick={onLogin}
          className="text-sm font-semibold text-[var(--accent)]"
        >
          Log In
        </button>
      </header>

      {/* ── MOBILE HERO (Remita-style phone mockup) ── */}
      <div className="relative z-10 md:hidden flex flex-col items-center px-5 pt-6 pb-10">
        {/* Phone mockup */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative w-[270px] h-[520px] rounded-[42px] overflow-hidden shadow-2xl shadow-green-200"
          style={{ background: 'linear-gradient(160deg, #16a34a 0%, #4ade80 100%)' }}
        >
          {/* Phone notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-black/20 z-10" />

          {/* Screen content */}
          <div className="absolute inset-0 pt-10 px-4 pb-4 flex flex-col">
            <div className="mt-2 text-white/80 text-xs font-medium">Good morning</div>
            <div className="text-white text-lg font-bold display">Alex Johnson</div>

            {/* Balance card on phone */}
            <div
              className="mt-4 rounded-2xl p-4 glass-card"
              style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.4)' }}
            >
              <div className="text-white/70 text-xs mb-1">Total Balance</div>
              <div className="text-white text-3xl font-bold display tabular">$0.00</div>
              <div className="text-white/60 text-xs mt-1">Connect wallet to view</div>
            </div>

            {/* Action row on phone */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {['Send', 'Receive', 'Swap', 'More'].map((label) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.25)' }}
                  >
                    <div className="w-5 h-5 rounded-full bg-white/50" />
                  </div>
                  <span className="text-white/80 text-[10px] font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* Mini service grid */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {['USDC', 'EURC', 'cirBTC'].map((token) => (
                <div
                  key={token}
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: 'rgba(255,255,255,0.22)' }}
                >
                  <div className="text-white text-xs font-bold">{token}</div>
                  <div className="text-white/60 text-[9px] mt-0.5">—</div>
                </div>
              ))}
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-white/30" />
        </motion.div>

        {/* Hero text below phone */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="mt-8 text-center"
        >
          <h1 className="display text-3xl font-bold text-[var(--ink)] leading-tight">
            Smart Payments,<br />
            <span style={{ color: 'var(--accent)' }}>Any Asset</span>
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed max-w-xs mx-auto">
            Send, receive, and swap USDC, EURC, and cirBTC instantly. Powered by Circle and Arc.
          </p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
          className="mt-8 w-full space-y-3"
        >
          <button
            onClick={onRegister}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-fast active:scale-95"
            style={{ background: 'var(--accent)' }}
          >
            Create Account <ArrowRight size={18} />
          </button>
          <button
            onClick={onLogin}
            className="w-full py-4 rounded-2xl font-bold text-[var(--accent)] text-base border-2 border-[var(--accent)] bg-white/60 transition-fast active:scale-95"
          >
            Sign In
          </button>
        </motion.div>

        {/* Wallet connect */}
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>or</span>
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show} className="underline font-medium text-[var(--accent)]">
                Connect Wallet
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </div>

      {/* ── DESKTOP HERO ── */}
      <section className="relative z-10 hidden md:flex flex-col lg:flex-row items-center justify-between gap-12 px-8 lg:px-16 pt-10 pb-20 max-w-7xl mx-auto">
        {/* Left text */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex-1 max-w-lg"
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(74,222,128,0.18)', color: 'var(--accent)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-light)] animate-pulse" />
            Built on Arc Testnet · Circle CCTP
          </div>
          <h1 className="display text-5xl lg:text-6xl font-bold text-[var(--ink)] leading-[1.08] tracking-tight">
            Digital Payments<br />
            for the <span style={{ color: 'var(--accent)' }}>Modern World</span>
          </h1>
          <p className="mt-5 text-lg text-[var(--muted)] leading-relaxed">
            Send, receive, and swap USDC, EURC, and cirBTC with zero friction. Real-time cross-chain transfers powered by Circle infrastructure.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={onRegister}
              className="px-7 py-3.5 rounded-2xl font-bold text-white text-base flex items-center gap-2 shadow-xl shadow-green-200 transition-fast hover:scale-[1.02] active:scale-95"
              style={{ background: 'var(--accent)' }}
            >
              Create Free Account <ArrowRight size={18} />
            </button>
            <button
              onClick={onLogin}
              className="px-7 py-3.5 rounded-2xl font-bold text-[var(--accent)] text-base border-2 border-[var(--accent)] bg-white/70 transition-fast hover:bg-green-50"
            >
              Sign In
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex items-center gap-6">
            {[
              { label: 'Circle Powered', icon: <Shield size={14} /> },
              { label: 'Sub-second Finality', icon: <Zap size={14} /> },
              { label: 'Cross-chain CCTP', icon: <Globe size={14} /> },
            ].map(({ label, icon }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span style={{ color: 'var(--accent)' }}>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right — large phone mockup */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="flex-shrink-0 relative"
        >
          <div
            className="relative w-[320px] h-[600px] rounded-[48px] overflow-hidden shadow-2xl shadow-green-200/60"
            style={{ background: 'linear-gradient(160deg, #16a34a 0%, #4ade80 80%, #a3e635 100%)' }}
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 rounded-full bg-black/20 z-10" />
            <div className="absolute inset-0 pt-14 px-5 pb-6 flex flex-col">
              <div className="text-white/70 text-sm">Good morning</div>
              <div className="text-white text-xl font-bold display">Alex Johnson</div>

              <div
                className="mt-5 rounded-3xl p-5"
                style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.35)' }}
              >
                <div className="text-white/70 text-xs mb-1 font-medium tracking-widest uppercase">Total Balance</div>
                <div className="text-white text-4xl font-bold display tabular">$0.00</div>
                <div className="text-white/60 text-sm mt-1">Connect wallet to view</div>
                <div className="mt-4 flex gap-2">
                  {['USDC', 'EURC', 'cirBTC'].map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                      style={{ background: 'rgba(255,255,255,0.20)' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {['Send', 'Receive', 'Swap', 'Bridge'].map((label) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.22)' }}
                    >
                      <div className="w-6 h-6 rounded-full bg-white/40" />
                    </div>
                    <span className="text-white/80 text-xs font-medium">{label}</span>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 rounded-2xl p-3"
                style={{ background: 'rgba(255,255,255,0.16)' }}
              >
                <div className="text-white/60 text-xs mb-2 font-medium">Recent Transactions</div>
                {['Received USDC', 'Swapped EURC', 'Sent cirBTC'].map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/25" />
                      <span className="text-white text-xs">{tx}</span>
                    </div>
                    <ChevronRight size={12} className="text-white/40" />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-white/30" />
          </div>

          {/* Floating stat cards */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-16 top-24 glass-card rounded-2xl px-4 py-3 shadow-lg"
          >
            <div className="text-xs text-[var(--muted)] font-medium">USDC Balance</div>
            <div className="text-[var(--ink)] font-bold tabular display">$0.00</div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute -right-12 bottom-32 glass-card rounded-2xl px-4 py-3 shadow-lg"
          >
            <div className="text-xs text-[var(--muted)] font-medium">Network</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-light)] animate-pulse" />
              <span className="text-[var(--ink)] font-bold text-sm">Arc Testnet</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" className="relative z-10 hidden md:block px-8 lg:px-16 pb-20 max-w-7xl mx-auto">
        <h2 className="display text-3xl font-bold text-[var(--ink)] text-center mb-12">
          Everything you need to move money
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              icon: <Zap size={24} />, title: 'Instant Transfers',
              desc: 'Sub-second finality on Arc. Send USDC, EURC, or cirBTC to anyone instantly.',
            },
            {
              icon: <ArrowRight size={24} />, title: 'Seamless Swaps',
              desc: 'Swap between any of the three supported assets with live exchange rates.',
            },
            {
              icon: <Globe size={24} />, title: 'Cross-chain Bridging',
              desc: 'Bridge USDC across chains via Circle CCTP with cryptographic attestation.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="glass-card rounded-3xl p-7">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(74,222,128,0.18)', color: 'var(--accent)' }}
              >
                {icon}
              </div>
              <h3 className="display text-lg font-bold text-[var(--ink)] mb-2">{title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ASSETS SECTION ── */}
      <section id="assets" className="relative z-10 hidden md:block px-8 lg:px-16 pb-24 max-w-7xl mx-auto">
        <h2 className="display text-3xl font-bold text-[var(--ink)] text-center mb-4">Supported Assets</h2>
        <p className="text-center text-[var(--muted)] mb-10">Three best-in-class digital assets, one simple interface.</p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { symbol: 'USDC', name: 'USD Coin', color: '#2775CA', desc: 'The world\'s leading regulated dollar stablecoin by Circle.' },
            { symbol: 'EURC', name: 'Euro Coin', color: '#0052B4', desc: 'Euro-backed stablecoin for European payments and FX.' },
            { symbol: 'cirBTC', name: 'Circle BTC', color: '#F7931A', desc: 'Bitcoin on Arc, bridged via Circle\'s secure infrastructure.' },
          ].map(({ symbol, name, color, desc }) => (
            <div key={symbol} className="glass-card rounded-3xl p-6 flex gap-4 items-start">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: color }}
              >
                {symbol.slice(0, 3)}
              </div>
              <div>
                <div className="font-bold text-[var(--ink)] display">{symbol}</div>
                <div className="text-xs text-[var(--muted)] font-medium mb-1">{name}</div>
                <p className="text-xs text-[var(--subtle)] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2 cursor-pointer">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}
      >
        <span className="text-white font-black text-sm display">L</span>
      </div>
      <span className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>
        Lime<span style={{ color: 'var(--accent)' }}>Pay</span>
      </span>
    </div>
  )
}
