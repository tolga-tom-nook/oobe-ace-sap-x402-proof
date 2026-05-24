import { Connection, PublicKey } from '@solana/web3.js';
import { cfg, requireLiveEnv } from './config.js';
import { loadKeypair } from './wallet.js';

const SAP_PROGRAM_ID = new PublicKey('SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

function deriveAgentPda(wallet: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('sap_agent'), wallet.toBuffer()], SAP_PROGRAM_ID)[0];
}

function deriveStatsPda(agent: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('sap_stats'), agent.toBuffer()], SAP_PROGRAM_ID)[0];
}

function derivePricingPda(agent: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('sap_pricing'), agent.toBuffer()], SAP_PROGRAM_ID)[0];
}

function sol(lamports: number | bigint) {
  return Number(lamports) / 1_000_000_000;
}

async function main() {
  requireLiveEnv();
  const connection = new Connection(cfg.solanaRpcUrl, 'confirmed');
  const kp = loadKeypair();
  const balanceLamports = await connection.getBalance(kp.publicKey, 'confirmed');
  const agentPda = deriveAgentPda(kp.publicKey);
  const statsPda = deriveStatsPda(agentPda);
  const pricingPda = derivePricingPda(agentPda);
  const existingAgent = await connection.getAccountInfo(agentPda, 'confirmed');
  const usdcAccounts = await connection.getParsedTokenAccountsByOwner(kp.publicKey, { mint: USDC_MINT }, 'confirmed');
  const usdc = usdcAccounts.value.reduce((sum, { account }) => {
    const amt = account.data.parsed.info.tokenAmount.uiAmountString || '0';
    return sum + Number(amt);
  }, 0);

  const capLamports = Math.floor(cfg.hardCapSol * 1_000_000_000);
  const minSapLamports = Math.floor(cfg.minSapRegisterSol * 1_000_000_000);
  const canRegisterWithinCap = existingAgent !== null || capLamports >= minSapLamports;

  console.log(JSON.stringify({
    ok: true,
    dryRun: cfg.dryRun,
    wallet: kp.publicKey.toBase58(),
    balances: { sol: sol(balanceLamports), lamports: balanceLamports, usdc },
    spendPolicy: {
      hardCapSol: cfg.hardCapSol,
      minSapRegisterSol: cfg.minSapRegisterSol,
      canRegisterWithinCap,
      blocker: canRegisterWithinCap ? null : `SAP registration docs/preflight require about ${cfg.minSapRegisterSol} SOL; hard cap is ${cfg.hardCapSol} SOL`,
    },
    sap: {
      programId: SAP_PROGRAM_ID.toBase58(),
      agentPda: agentPda.toBase58(),
      statsPda: statsPda.toBase58(),
      pricingPda: pricingPda.toBase58(),
      alreadyRegistered: existingAgent !== null,
    },
    x402: {
      network: cfg.aceNetwork,
      maxUsdcMicro: cfg.maxUsdcMicro.toString(),
      hasUsdc: usdc > 0,
      blocker: usdc > 0 ? null : 'No SPL USDC funded; skipping paid Ace x402 calls.',
    },
    checks: [
      'No submission/post/deploy action in this skeleton',
      'Live mode requires funded Solana mainnet wallet',
      'Ace x402 network defaults to solana',
      'SAP registration is simulated before sending; mainnet may require legacy account order without pricing_menu',
    ],
  }, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
