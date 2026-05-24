# Preflight findings: OOBE × Ace Data Cloud bounty

## Smallest valid workflow
- A local autonomous TypeScript agent that owns one Solana mainnet wallet.
- Register/update that wallet as an SAP agent with `x402Endpoint` pointing to our deployed service URL.
- On a scheduled/self-triggered run, query Solana state through OOBE/Synapse RPC and ask AceDataCloud `openai.chat.completions` to produce a short analysis, paid by x402 USDC.
- Persist a receipt JSON containing: SAP agent PDA/registration tx, Ace request/response, x402 settlement tx/header, wallet pubkey, timestamps.
- Demo/GitHub/X are manual deliverables only; no automated submit/post.

## Credentials/funds/accounts
- Solana mainnet keypair for SAP agent and Ace Solana x402 payer.
- SOL for transaction fees/rent and SAP registration fee; SAP docs list `0.1 SOL` registration plus fees/rent.
- SPL USDC on Solana for AceDataCloud x402 payments; docs say a few cents per request, sample chat was ~0.095215 USDC on Solana.
- Optional OOBE/Synapse RPC API key/URL if using their paid/staging RPC instead of public RPC.
- Public HTTPS URL for `x402Endpoint` before live SAP registration/update.
- GitHub repo and X account only for final authorized submission/demo posts.

## Useful local commands
```bash
# Ace x402 package
cd /home/ubuntu/bounty-work/X402Client/typescript
npm install && npm run build

# Ace live E2E; requires funded keys
export SOLANA_TEST_PRIVATE_KEY=...
node --experimental-strip-types scripts/test-solana-e2e.ts

# OOBE x402 RPC server
cd /home/ubuntu/bounty-work/x402-synapse-rpc-server
npm install
PORT=3333 BASE_URL=http://localhost:3333 MERCHANT_ADDRESS=<sol_pubkey> RPC_URL=<solana_rpc_url> npm run dev
curl http://localhost:3333/health
curl -X POST http://localhost:3333/rpc/getBalance -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getBalance","params":["So11111111111111111111111111111111111111112"]}'

# Skeleton created here
cd /home/ubuntu/tom-agent/oobe-ace-agent-skeleton
npm install
npm run preflight
npm run demo:dry
```

## Feasibility blockers
- Cannot complete bounty locally without real funded mainnet wallet, USDC, SOL, and a public HTTPS endpoint.
- SAP registration is mainnet and stateful; must not run until authorized.
- Ace x402 live calls settle real funds; keep dry-run default.
- X402Client TS Solana helper expects a wallet with `signAndSendTransaction`; skeleton must implement safe send/confirm and USDC ATA checks.
- `x402-synapse-rpc-server` requires non-empty `RPC_URL`; public Solana RPC may rate-limit, Synapse API key may be needed.
- Final bounty requires demo/GitHub/X/submission; external posting/submission is forbidden without explicit authorization.
