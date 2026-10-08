// Shared asset definitions for LimePay
// 'live'   = real on-chain ERC-20 read on Arc Testnet
// 'circle' = Circle ERC-20 on Arc (address TBD from registry)
// 'bridge' = wrapped/bridged representation, indicative balance
// 'onramp' = fiat or off-chain asset, indicative balance

export type AssetSource = 'live' | 'circle' | 'bridge' | 'onramp'

export interface AssetDef {
  symbol: string
  name: string
  color: string
  bgColor: string
  currencySymbol: string
  decimals: number
  source: AssetSource
  note: string
  /** true = available for swap */
  swappable: boolean
  /** true = available for earn */
  earnable: boolean
  /** true = can be used as borrow collateral */
  collateral: boolean
}

export const ASSETS: AssetDef[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    color: '#2775CA',
    bgColor: 'rgba(39,117,202,0.12)',
    currencySymbol: '$',
    decimals: 6,
    source: 'live',
    note: 'Native Circle stablecoin · Arc Testnet (live balance)',
    swappable: true,
    earnable: true,
    collateral: false,
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    color: '#003087',
    bgColor: 'rgba(0,48,135,0.10)',
    currencySymbol: '€',
    decimals: 6,
    source: 'circle',
    note: 'Circle Euro stablecoin · Arc Testnet (indicative)',
    swappable: true,
    earnable: true,
    collateral: false,
  },
  {
    symbol: 'cirBTC',
    name: 'Circle BTC',
    color: '#F7931A',
    bgColor: 'rgba(247,147,26,0.12)',
    currencySymbol: '₿',
    decimals: 8,
    source: 'circle',
    note: 'Circle wrapped BTC · Arc Testnet (indicative)',
    swappable: true,
    earnable: true,
    collateral: true,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    color: '#627EEA',
    bgColor: 'rgba(98,126,234,0.12)',
    currencySymbol: 'Ξ',
    decimals: 18,
    source: 'bridge',
    note: 'Wrapped ETH via bridge · indicative balance',
    swappable: true,
    earnable: false,
    collateral: true,
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    color: '#F7931A',
    bgColor: 'rgba(247,147,26,0.10)',
    currencySymbol: '₿',
    decimals: 8,
    source: 'bridge',
    note: 'Wrapped BTC via bridge · indicative balance',
    swappable: true,
    earnable: false,
    collateral: true,
  },
  {
    symbol: 'NGN',
    name: 'Nigerian Naira',
    color: '#008751',
    bgColor: 'rgba(0,135,81,0.12)',
    currencySymbol: '₦',
    decimals: 2,
    source: 'onramp',
    note: 'NGN stablecoin via fiat on-ramp · indicative',
    swappable: true,
    earnable: false,
    collateral: false,
  },
  {
    symbol: 'MOVE',
    name: 'Movement',
    color: '#7C3AED',
    bgColor: 'rgba(124,58,237,0.10)',
    currencySymbol: 'M',
    decimals: 8,
    source: 'bridge',
    note: 'Movement token · bridged representation · indicative',
    swappable: true,
    earnable: false,
    collateral: false,
  },
  {
    symbol: 'APT',
    name: 'Aptos',
    color: '#2DD4BF',
    bgColor: 'rgba(45,212,191,0.10)',
    currencySymbol: 'A',
    decimals: 8,
    source: 'bridge',
    note: 'Aptos token · bridged representation · indicative',
    swappable: true,
    earnable: false,
    collateral: false,
  },
]

export const ASSET_MAP = Object.fromEntries(ASSETS.map((a) => [a.symbol, a])) as Record<string, AssetDef>

// Indicative exchange rates (all relative to USDC = 1.00)
// Real rates would come from a price oracle — these are for demo purposes only
export const USD_RATES: Record<string, number> = {
  USDC:   1.00,
  EURC:   1.087,
  cirBTC: 65359,
  ETH:    3480,
  BTC:    67200,
  NGN:    0.00065,  // ~1540 NGN per USD
  MOVE:   0.82,
  APT:    11.40,
}

/** Get indicative rate: how many `to` per 1 `from` */
export function getSwapRate(from: string, to: string): number | null {
  if (from === to) return null
  const fromUsd = USD_RATES[from]
  const toUsd = USD_RATES[to]
  if (!fromUsd || !toUsd) return null
  return fromUsd / toUsd
}

export const SOURCE_BADGE: Record<AssetSource, { label: string; color: string; bg: string }> = {
  live:   { label: 'Live',       color: '#15803d', bg: 'rgba(74,222,128,0.18)'   },
  circle: { label: 'Circle',     color: '#1d4ed8', bg: 'rgba(59,130,246,0.14)'   },
  bridge: { label: 'Bridged',    color: '#0369a1', bg: 'rgba(14,165,233,0.14)'   },
  onramp: { label: 'On-ramp',    color: '#7c3aed', bg: 'rgba(139,92,246,0.14)'   },
}

// Earn product definitions
export interface EarnProduct {
  assetSymbol: string
  apy: string
  apyNum: number
  minDeposit: string
  description: string
  protocol: string
  risk: 'Low' | 'Medium' | 'High'
}

export const EARN_PRODUCTS: EarnProduct[] = [
  {
    assetSymbol: 'USDC',
    apy: '5.2%',
    apyNum: 5.2,
    minDeposit: '$10',
    description: 'Deposit USDC and earn stable yield via Circle Yield protocols.',
    protocol: 'Circle Yield',
    risk: 'Low',
  },
  {
    assetSymbol: 'EURC',
    apy: '4.8%',
    apyNum: 4.8,
    minDeposit: '€10',
    description: 'Earn yield on your Euro-denominated stablecoins.',
    protocol: 'Circle Yield',
    risk: 'Low',
  },
  {
    assetSymbol: 'cirBTC',
    apy: '3.1%',
    apyNum: 3.1,
    minDeposit: '0.0001 BTC',
    description: 'Put your Bitcoin to work earning passive yield.',
    protocol: 'Arc Lending',
    risk: 'Medium',
  },
]

// Borrow product definitions
export interface BorrowProduct {
  collateralSymbol: string
  borrowSymbol: string
  ltv: string
  apr: string
  aprNum: number
  description: string
}

export const BORROW_PRODUCTS: BorrowProduct[] = [
  {
    collateralSymbol: 'cirBTC',
    borrowSymbol: 'USDC',
    ltv: '70%',
    apr: '8.5%',
    aprNum: 8.5,
    description: 'Use your cirBTC as collateral to borrow USDC stablecoins.',
  },
  {
    collateralSymbol: 'ETH',
    borrowSymbol: 'USDC',
    ltv: '75%',
    apr: '7.2%',
    aprNum: 7.2,
    description: 'Borrow USDC against your wrapped ETH holdings.',
  },
  {
    collateralSymbol: 'ETH',
    borrowSymbol: 'EURC',
    ltv: '70%',
    apr: '7.8%',
    aprNum: 7.8,
    description: 'Borrow EURC against your wrapped ETH holdings.',
  },
  {
    collateralSymbol: 'BTC',
    borrowSymbol: 'USDC',
    ltv: '65%',
    apr: '9.0%',
    aprNum: 9.0,
    description: 'Use your wrapped BTC as collateral to borrow USDC.',
  },
]
