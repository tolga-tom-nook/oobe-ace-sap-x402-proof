# OOBE × AceDataCloud SAP/x402 proof

## Wallet

- Solana wallet: `FJdxwPbWgFqghFaFyW9qSQW1jbMhuTrDfTrbZAuVV4SZ`
- Final verified balance after proof:
  - SOL: `0.15958132`
  - SPL USDC: `9.904785`

## 1. AceDataCloud Solana x402 paid proof

A real Solana x402 payment was made to AceDataCloud under the authorized USDC cap.

- API: `https://api.acedata.cloud/openai/chat/completions`
- Request: `gpt-4o-mini`, prompt `Say hi in 3 words`, `max_tokens=10`
- x402 network: `solana`
- USDC required/spent: `0.095215`
- Response status: `200`
- Response content: `Hello! How are?`
- Settlement tx: `3EF2wCNajTCnei6x4ZEe3fUevCqcUAx7WZPGKssuMniAKLgvt7ztmFiAU2xbpVXVHGiytd7gFP1Eszd155ch6CZH`
- Explorer: https://explorer.solana.com/tx/3EF2wCNajTCnei6x4ZEe3fUevCqcUAx7WZPGKssuMniAKLgvt7ztmFiAU2xbpVXVHGiytd7gFP1Eszd155ch6CZH?cluster=mainnet-beta
- Local receipt: `receipts/ace-solana-x402-success-2026-05-23.json`

## 2. OOBE/Synapse SAP mainnet registration proof

The SAP agent was registered on Solana mainnet after diagnosing an SDK/IDL mismatch.

- SAP program: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`
- Agent PDA: `3k7By2iJBq95ZHDm2UdkQPk3mvDFymPGKXXhnLGGAzTz`
- Stats PDA: `C9rQ35HR9T5oCApGfT1nabxce1ZBdHR9AwECGsWFLAuC`
- Global registry PDA: `9odFrYBBZq6UQC6aGyzMPNXWJQn55kMtfigzhLg6S6L5`
- Registration tx: `4iLknBBvQvpkXiHPSiV4AKmF2i1oUb5jdXPvMkptSJfh823rMXBoZerzcrQxdPPSs1Rn63NMuwwsERa6hQX87Jpe`
- Explorer: https://explorer.solana.com/tx/4iLknBBvQvpkXiHPSiV4AKmF2i1oUb5jdXPvMkptSJfh823rMXBoZerzcrQxdPPSs1Rn63NMuwwsERa6hQX87Jpe?cluster=mainnet-beta
- SOL spent: `0.04042868` SOL
- Local receipt: `receipts/sap-register-live-success-2026-05-24T00-06-31-230Z.json`

Registered on-chain fields verified after confirmation:

- Name: `Tolga OOBE Ace Agent`
- Description: `Autonomous Solana data agent using OOBE/Synapse SAP identity and AceDataCloud x402-paid analysis.`
- Capability:
  - id: `ace:solana-account-summary`
  - protocolId: `ace-data-cloud`
  - version: `1.0.0`
  - description: `Summarize Solana account/RPC observations using AceDataCloud via x402.`
- Protocols: `SAP`, `x402`, `AceDataCloud`
- Agent ID: `did:sap:tolga-oobe-ace-agent`
- Agent URI: `https://api.acedata.cloud/openai/chat/completions`
- x402 endpoint: `https://api.acedata.cloud/openai/chat/completions`
- Active: `true`

## SAP SDK/IDL mismatch note

The local `@oobe-protocol-labs/synapse-sap-sdk` IDL currently includes a `pricing_menu` account in `register_agent`. The deployed mainnet SAP program expects the older account order without that `pricing_menu` account. Sending the current IDL account list caused simulation failure:

- Anchor error: `3012 AccountNotInitialized`
- Reported account: `global_registry`
- Root cause: account index shift caused the uninitialized pricing PDA to be read as `global_registry`.

The successful registration used the same instruction args but removed only the `pricing_menu` account from the local IDL before building the transaction. Simulation then succeeded and the tx was sent.

Relevant scripts:

- `scripts/simulate-sap-register.mjs` — reproduces the current-IDL failure.
- `scripts/simulate-sap-register-legacy-accounts.mjs` — simulates the deployed-program-compatible account order.
- `scripts/send-sap-register-legacy-accounts.mjs` — sends the guarded live registration only after simulation succeeds.
