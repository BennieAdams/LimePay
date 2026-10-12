/**
 * LimePay Local Balance Store
 * ────────────────────────────
 * Tracks indicative balances for all non-USDC assets (NGN, ETH, BTC, MOVE, APT, EURC, cirBTC).
 * USDC is always read live from the ERC-20 contract on Arc Testnet — never stored here.
 *
 * Balances are updated whenever swaps, earns, or receives are recorded.
 * Persisted to localStorage so they survive page refreshes.
 */

const STORAGE_KEY = 'limepay_balances_v1'

export type AssetSymbol = 'NGN' | 'ETH' | 'BTC' | 'MOVE' | 'APT' | 'EURC' | 'cirBTC'

// Indicative starting balances (all zero for a fresh user)
const DEFAULT_BALANCES: Record<AssetSymbol, number> = {
  NGN:    0,
  ETH:    0,
  BTC:    0,
  MOVE:   0,
  APT:    0,
  EURC:   0,
  cirBTC: 0,
}

function load(): Record<AssetSymbol, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number>
      // Merge with defaults so new assets get 0
      return { ...DEFAULT_BALANCES, ...parsed }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_BALANCES }
}

function save(balances: Record<AssetSymbol, number>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(balances)) } catch { /* ignore */ }
}

/** Get the current balance for an asset */
export function getBalance(symbol: string): number {
  if (symbol === 'USDC') return 0 // always from chain
  const b = load()
  return b[symbol as AssetSymbol] ?? 0
}

/** Get all non-USDC balances */
export function getAllBalances(): Record<AssetSymbol, number> {
  return load()
}

/** Add to a balance (e.g. after a swap into NGN, or an earn deposit payout) */
export function creditBalance(symbol: string, amount: number) {
  if (symbol === 'USDC' || amount <= 0) return
  const b = load()
  const key = symbol as AssetSymbol
  if (key in b) {
    b[key] = Math.max(0, (b[key] ?? 0) + amount)
    save(b)
  }
}

/** Subtract from a balance (e.g. after a send or a swap out of NGN) */
export function debitBalance(symbol: string, amount: number) {
  if (symbol === 'USDC' || amount <= 0) return
  const b = load()
  const key = symbol as AssetSymbol
  if (key in b) {
    b[key] = Math.max(0, (b[key] ?? 0) - amount)
    save(b)
  }
}

/** Reset all indicative balances (e.g. on logout) */
export function resetBalances() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}
