# OOBE × Ace Data Cloud autonomous agent skeleton

Smallest local workflow for the Superteam bounty, intentionally dry-run by default.

## Workflow
1. Preflight wallet/env and ensure no external post/deploy/claim occurs.
2. Register/update SAP mainnet agent with `x402Endpoint=AGENT_PUBLIC_URL` (live only).
3. Autonomous loop calls AceDataCloud via x402-paid SDK to summarize a Solana account/RPC observation.
4. Persist demo receipt locally: input, Ace response, payment tx header if returned, optional SAP tx signature.

## Commands
```bash
cd /home/ubuntu/tom-agent/oobe-ace-agent-skeleton
npm install
npm run preflight
npm run demo:dry
# live only after authorization + funded wallet + cap that covers SAP registration:
# cp .env.example .env; edit values; DRY_RUN=0 npm run demo:live
```

## Current proof status
- AceDataCloud Solana x402 paid call succeeded. Receipt: `receipts/ace-solana-x402-success-2026-05-23.json`.
- SAP mainnet registration succeeded. Receipt: `receipts/sap-register-live-success-2026-05-24T00-06-31-230Z.json`.
- Summary package for bounty/demo submission: `SUBMISSION-PROOF.md`.

## Current guardrails
- Wallet keypair is read from `SOLANA_KEYPAIR_PATH` by default; no private key is committed.
- Spend caps are enforced before live calls/transactions.
- Ace x402 paid calls are previewed/refused unless the required USDC amount is within cap.
- SAP registration is simulated before sending. Mainnet currently requires the legacy account order without `pricing_menu`; see `scripts/send-sap-register-legacy-accounts.mjs`.
- Dry runs, blocked live attempts, and successful paid attempts write local JSON receipts under `receipts/`.
