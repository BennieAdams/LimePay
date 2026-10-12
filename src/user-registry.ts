/**
 * LimePay User Registry
 * ─────────────────────
 * Stores a local directory of users (username + account number → wallet address).
 * On a real backend this would be a server-side lookup; here we use localStorage
 * so the feature is fully functional within a single browser session / device.
 *
 * Account number format: LP-XXXXXXXX  (LP prefix + 8 random digits)
 * Username format:       @<displayName_slug>  (lowercased, spaces → underscores)
 */

const REGISTRY_KEY = 'limepay_registry_v1'

export interface RegistryEntry {
  username: string        // e.g. "alex_j"
  accountNumber: string   // e.g. "LP-90234521"
  displayName: string
  walletAddress: string   // 0x… or empty string for email-only users
  email: string
  createdAt: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadRegistry(): RegistryEntry[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    return raw ? (JSON.parse(raw) as RegistryEntry[]) : []
  } catch { return [] }
}

function saveRegistry(entries: RegistryEntry[]) {
  try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries)) } catch { /* noop */ }
}

/** Slugify a display name into a username */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20) || 'user'
}

/** Generate a unique LP-XXXXXXXX account number */
function generateAccountNumber(existing: RegistryEntry[]): string {
  const existingNos = new Set(existing.map((e) => e.accountNumber))
  for (let attempt = 0; attempt < 100; attempt++) {
    const digits = Math.floor(10_000_000 + Math.random() * 90_000_000).toString()
    const acct = `LP-${digits}`
    if (!existingNos.has(acct)) return acct
  }
  return `LP-${Date.now().toString().slice(-8)}`
}

/** Make sure the username is unique; append a numeric suffix if needed */
function uniqueUsername(base: string, existing: RegistryEntry[]): string {
  const taken = new Set(existing.map((e) => e.username))
  if (!taken.has(base)) return base
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}${i}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}_${Date.now().toString().slice(-4)}`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Register (or update) a user in the local registry.
 * Called after KYC completes or whenever the profile is updated.
 * Returns the final RegistryEntry that was saved.
 */
export function registerUser(opts: {
  displayName: string
  email: string
  walletAddress?: string
  /** Supply an existing accountNumber to preserve it on updates */
  existingAccountNumber?: string
  /** Supply an existing username to preserve it on updates */
  existingUsername?: string
}): RegistryEntry {
  const registry = loadRegistry()

  // Reuse or generate
  const accountNumber = opts.existingAccountNumber ?? generateAccountNumber(registry)
  const baseSlug = slugify(opts.displayName || opts.email.split('@')[0] || 'user')
  const username = opts.existingUsername ?? uniqueUsername(baseSlug, registry)

  const entry: RegistryEntry = {
    username,
    accountNumber,
    displayName: opts.displayName,
    walletAddress: opts.walletAddress ?? '',
    email: opts.email,
    createdAt: Date.now(),
  }

  // Upsert by email
  const idx = registry.findIndex((e) => e.email === opts.email)
  if (idx >= 0) {
    registry[idx] = { ...registry[idx], ...entry, createdAt: registry[idx].createdAt }
  } else {
    registry.push(entry)
  }

  saveRegistry(registry)
  return entry
}

/**
 * Resolve a recipient string (wallet address, @username, or LP-XXXXXXXX account number).
 * Also checks the current session as a fallback so the logged-in user's own account number
 * and username are always resolvable even before an explicit registry write.
 * Returns the matching RegistryEntry or null if not found.
 */
export function resolveRecipient(input: string): RegistryEntry | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Build a combined lookup list: registry + current session (as a virtual entry)
  const registry = loadRegistry()
  const allEntries = [...registry]

  // Inject current session user if not already in registry
  try {
    // Try both session keys (v2 is the current one; v1 was used in older builds)
    const sessionRaw = localStorage.getItem('limepay_session_v2') ?? localStorage.getItem('limepay_session')
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw) as {
        email?: string; displayName?: string; username?: string
        accountNumber?: string; walletAddress?: string; verified?: boolean
      }
      if (session.email && session.accountNumber) {
        const alreadyIn = registry.some((e) => e.email === session.email)
        if (!alreadyIn) {
          allEntries.push({
            username: session.username ?? slugify(session.displayName ?? session.email.split('@')[0]),
            accountNumber: session.accountNumber,
            displayName: session.displayName ?? session.email.split('@')[0],
            walletAddress: session.walletAddress ?? '',
            email: session.email,
            createdAt: Date.now(),
          })
        }
      }
    }
  } catch { /* ignore */ }

  // Wallet address (0x...)
  if (trimmed.startsWith('0x')) {
    return allEntries.find((e) => e.walletAddress.toLowerCase() === trimmed.toLowerCase()) ?? null
  }

  // Account number (LP-XXXXXXXX) — match loosely, compare normalised
  const normalised = trimmed.toUpperCase().replace(/\s/g, '')
  if (/^LP-\d+$/i.test(normalised)) {
    return allEntries.find((e) => e.accountNumber.toUpperCase() === normalised) ?? null
  }

  // Username (@name or plain name)
  const slug = trimmed.startsWith('@') ? trimmed.slice(1).toLowerCase().trim() : trimmed.toLowerCase().trim()
  return allEntries.find((e) => e.username.toLowerCase() === slug) ?? null
}

/**
 * Look up the current user's own entry by email.
 */
export function lookupByEmail(email: string): RegistryEntry | null {
  const registry = loadRegistry()
  return registry.find((e) => e.email === email) ?? null
}

/** Get all registry entries (for demo "address book" purposes) */
export function getAllUsers(): RegistryEntry[] {
  return loadRegistry()
}

/**
 * Read the current session from localStorage and ensure the user is in the registry.
 * Safe to call on every load — idempotent.
 */
export function syncSessionToRegistry() {
  try {
    // Try both session keys (v2 is the current one; v1 was used in older builds)
    const sessionRaw = localStorage.getItem('limepay_session_v2') ?? localStorage.getItem('limepay_session')
    if (!sessionRaw) return
    const session = JSON.parse(sessionRaw) as {
      email?: string; displayName?: string; username?: string
      accountNumber?: string; walletAddress?: string; verified?: boolean
    }
    if (!session.email || !session.verified) return
    registerUser({
      displayName: session.displayName ?? session.email.split('@')[0],
      email: session.email,
      walletAddress: session.walletAddress,
      existingAccountNumber: session.accountNumber,
      existingUsername: session.username,
    })
  } catch { /* ignore */ }
}

// ─── Demo seed ────────────────────────────────────────────────────────────────
/**
 * Pre-seed a handful of demo users so the username/account-number lookup works
 * out of the box in a fresh browser session without needing a second real user.
 * Safe to call on every load — it checks first and skips if they already exist.
 */
export function seedDemoUsers() {
  const registry = loadRegistry()
  const demoUsers: Omit<RegistryEntry, 'createdAt'>[] = [
    { username: 'bulus_kure',  accountNumber: 'LP-10023456', displayName: 'Bulus Kure',    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fA01', email: 'bulus@demo.limepay' },
    { username: 'ada_obi',     accountNumber: 'LP-20034567', displayName: 'Ada Obi',        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fA02', email: 'ada@demo.limepay' },
    { username: 'emeka_j',     accountNumber: 'LP-30045678', displayName: 'Emeka Johnson',  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fA03', email: 'emeka@demo.limepay' },
    { username: 'fatima_s',    accountNumber: 'LP-40056789', displayName: 'Fatima Suleiman',walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fA04', email: 'fatima@demo.limepay' },
    { username: 'tunde_a',     accountNumber: 'LP-50067890', displayName: 'Tunde Adeyemi',  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fA05', email: 'tunde@demo.limepay' },
  ]

  let changed = false
  for (const demo of demoUsers) {
    const alreadyExists =
      registry.some((e) => e.username === demo.username) ||
      registry.some((e) => e.accountNumber === demo.accountNumber)
    if (!alreadyExists) {
      registry.push({ ...demo, createdAt: Date.now() })
      changed = true
    }
  }
  if (changed) saveRegistry(registry)
}
