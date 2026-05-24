# Issue

## Title

OOBE/Synapse SAP SDK IDL `register_agent` account layout mismatches deployed mainnet program

## Problem

SAP mainnet registration fails when using the current local `@oobe-protocol-labs/synapse-sap-sdk` IDL/account layout for `register_agent`.

This looks like an SDK/IDL version drift issue: the published/current SDK includes an account that the deployed mainnet program does not yet consume.

The deployed mainnet SAP program expects the legacy `register_agent` account layout without `pricing_menu`:

```text
wallet
agent
agent_stats
global_registry
system_program
```

The current SDK sends:

```text
wallet
agent
agent_stats
pricing_menu
global_registry
system_program
```

That one-account shift means the uninitialized `pricing_menu` PDA is passed in the slot where the deployed program expects `global_registry`.

Simulation then fails with:

```text
AnchorError caused by account: global_registry.
Error Code: AccountNotInitialized.
Error Number: 3012.
Error Message: The program expected this account to be already initialized.
```

This error is misleading because the real global registry PDA exists, is owned by the SAP program, and fetches successfully.

## Evidence

- SAP program: `SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`
- Real global registry PDA: `9odFrYBBZq6UQC6aGyzMPNXWJQn55kMtfigzhLg6S6L5`
- Global registry account exists and fetches as `globalRegistry`
- Current SDK account layout simulation fails with `AccountNotInitialized` on `global_registry`
- Legacy account layout without `pricing_menu` simulates successfully
- Mainnet registration succeeds using the legacy account order
- On-chain agent fetch confirmed:
  - name: `Tolga OOBE Ace Agent`
  - active: `true`
  - x402 endpoint: `https://api.acedata.cloud/openai/chat/completions`
  - agent PDA: `3k7By2iJBq95ZHDm2UdkQPk3mvDFymPGKXXhnLGGAzTz`

Successful registration tx:

`4iLknBBvQvpkXiHPSiV4AKmF2i1oUb5jdXPvMkptSJfh823rMXBoZerzcrQxdPPSs1Rn63NMuwwsERa6hQX87Jpe`

Explorer:

https://explorer.solana.com/tx/4iLknBBvQvpkXiHPSiV4AKmF2i1oUb5jdXPvMkptSJfh823rMXBoZerzcrQxdPPSs1Rn63NMuwwsERa6hQX87Jpe?cluster=mainnet-beta

Registered agent PDA:

`3k7By2iJBq95ZHDm2UdkQPk3mvDFymPGKXXhnLGGAzTz`

## Expected behavior

The SDK should construct `register_agent` transactions compatible with the deployed mainnet SAP program, or clearly version/feature-gate the `pricing_menu` account so callers do not get a misleading `global_registry` initialization error.

## Actual behavior

The current SDK/IDL account layout causes mainnet simulation to fail before send with `AccountNotInitialized` on `global_registry`.

## Proposed fix

Make the SDK robust to deployed program account-layout versioning for `register_agent`:

- add a mainnet-compatible `register_agent` builder path without `pricing_menu`;
- keep the newer `pricing_menu` layout available only behind an explicit version/feature gate if needed for newer deployments;
- add a regression/simulation test asserting the account order for current mainnet registration; and
- document the SDK/IDL version drift and misleading `global_registry` error mode.

---

# PR Draft

## Title

fix(sap): use deployed-compatible register_agent account layout on mainnet

## Summary

This PR fixes SAP mainnet registration failures caused by SDK/IDL version drift between the current SDK account list and the deployed SAP mainnet program's `register_agent` account layout.

The current SDK includes `pricing_menu` in `register_agent`. The deployed mainnet program expects the legacy layout without that account, so account indexes shift and the uninitialized pricing PDA is interpreted as `global_registry`.

This produces a misleading Anchor `3012 AccountNotInitialized` error even though the actual global registry PDA exists and fetches correctly.

## Account-order comparison

Expected by deployed mainnet:

```text
wallet, agent, agent_stats, global_registry, system_program
```

Current SDK sends:

```text
wallet, agent, agent_stats, pricing_menu, global_registry, system_program
```

The extra `pricing_menu` account shifts `global_registry` one slot later than the deployed program expects.

## Changes

- Add a mainnet-compatible `register_agent` builder path without `pricing_menu`.
- Keep existing instruction arguments unchanged.
- Gate the newer `pricing_menu` account layout behind an explicit version/feature path if it is needed for newer deployments.
- Add a regression check for account ordering so `global_registry` is passed in the correct slot for current mainnet.
- Document the mainnet compatibility behavior and the misleading `global_registry` error mode.

## Validation

Validated locally against Solana mainnet before sending:

- Current SDK account layout simulation failed with:

```text
AnchorError caused by account: global_registry
Error Code: AccountNotInitialized
Error Number: 3012
```

- Legacy account layout simulation succeeded.
- Live SAP registration succeeded on mainnet:

```text
4iLknBBvQvpkXiHPSiV4AKmF2i1oUb5jdXPvMkptSJfh823rMXBoZerzcrQxdPPSs1Rn63NMuwwsERa6hQX87Jpe
```

Explorer:

https://explorer.solana.com/tx/4iLknBBvQvpkXiHPSiV4AKmF2i1oUb5jdXPvMkptSJfh823rMXBoZerzcrQxdPPSs1Rn63NMuwwsERa6hQX87Jpe?cluster=mainnet-beta

## Risk

Low if implemented as an additive compatibility path. Future/development deployments that require `pricing_menu` should keep using the newer account layout behind an explicit version flag, feature flag, or program/IDL version check.

## Notes for reviewer

The issue is the account-order drift, not the demo agent itself.

Expected by deployed mainnet:

```text
wallet, agent, agent_stats, global_registry, system_program
```

Current SDK sends:

```text
wallet, agent, agent_stats, pricing_menu, global_registry, system_program
```

That one-account shift is what makes the program report `global_registry` as uninitialized.
