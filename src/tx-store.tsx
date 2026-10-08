/**
 * Global in-memory transaction store for LimePay.
 * Persists to localStorage so history survives page refreshes.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type TxType = 'send' | 'receive' | 'swap' | 'earn' | 'borrow' | 'card' | 'bridge' | 'bill'
export type TxStatus = 'pending' | 'confirmed' | 'failed'

export interface TxRecord {
  id: string
  type: TxType
  asset: string
  amount: string
  toAsset?: string
  toAmount?: string
  toAddress?: string
  fromChain?: string
  toChain?: string
  timestamp: number   // unix ms
  status: TxStatus
  hash?: string
  note?: string
}

interface TxStore {
  txs: TxRecord[]
  addTx: (tx: Omit<TxRecord, 'id' | 'timestamp'>) => string
  updateTx: (id: string, patch: Partial<TxRecord>) => void
  clearAll: () => void
}

const Ctx = createContext<TxStore | null>(null)

const STORAGE_KEY = 'limepay_txs'

function load(): TxRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as TxRecord[]
  } catch { /* ignore */ }
  return []
}

function save(txs: TxRecord[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(txs.slice(0, 200))) } catch { /* ignore */ }
}

export function TxStoreProvider({ children }: { children: ReactNode }) {
  const [txs, setTxs] = useState<TxRecord[]>(load)

  useEffect(() => { save(txs) }, [txs])

  const addTx = useCallback((tx: Omit<TxRecord, 'id' | 'timestamp'>): string => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const record: TxRecord = { ...tx, id, timestamp: Date.now() }
    setTxs((prev) => [record, ...prev])
    return id
  }, [])

  const updateTx = useCallback((id: string, patch: Partial<TxRecord>) => {
    setTxs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const clearAll = useCallback(() => {
    setTxs([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return <Ctx.Provider value={{ txs, addTx, updateTx, clearAll }}>{children}</Ctx.Provider>
}

export function useTxStore(): TxStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTxStore must be used inside TxStoreProvider')
  return ctx
}
