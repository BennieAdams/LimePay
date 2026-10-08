# LimePay

> Built with Arc Studio - money-powered apps in minutes

LimePay is a full-stack USDC-first fintech web app supporting 8 assets (USDC, EURC, cirBTC, ETH, BTC, NGN, MOVE, APT) with Send/Receive, Swap, Bridge (CCTP), Earn, Borrow, Card Pay, and Bill Payments.

---

## Deployed Smart Contracts

| Contract | Address | Network | Explorer |
|---|---|---|---|
| LimePayPaymentRouter | `0x9260765cd3b4f1e05bc94eefa73ef9ebd5225ee9` | Arc Testnet | [View](https://explorer.testnet.arc.io/address/0x9260765cd3b4f1e05bc94eefa73ef9ebd5225ee9) |

## What This App Does

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```
