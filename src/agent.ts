import fs from 'node:fs';
import path from 'node:path';
import { Connection, PublicKey } from '@solana/web3.js';
import { cfg, requireLiveEnv } from './config.js';
import { loadKeypair } from './wallet.js';

const SAP_PROGRAM_ID = new PublicKey('SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

function deriveAgentPda(wallet: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('sap_agent'), wallet.toBuffer()], SAP_PROGRAM_ID)[0];
}

async function writeReceipt(data: unknown) {
  const dir = path.resolve('receipts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return file;
}

async function main() {
  requireLiveEnv();
  const observation = { account: 'So11111111111111111111111111111111111111112', task: 'summarize SOL token account context' };

  if (cfg.dryRun) {
    const receipt = await writeReceipt({
      mode: 'dry-run',
      createdAt: new Date().toISOString(),
      would: [
        'derive agent keypair and SAP PDA',
        'register/update SAP mainnet agent with x402Endpoint when cap allows',
        'call AceDataCloud openai.chat.completions through x402 payment handler when USDC is funded',
        'write local receipt JSON for demo video/GitHub README',
      ],
      observation,
    });
    console.log(JSON.stringify({ mode: 'dry-run', receipt, observation }, null, 2));
    return;
  }

  const connection = new Connection(cfg.solanaRpcUrl, 'confirmed');
  const kp = loadKeypair();
  const balanceLamports = await connection.getBalance(kp.publicKey, 'confirmed');
  const capLamports = Math.floor(cfg.hardCapSol * 1_000_000_000);
  const minSapLamports = Math.floor(cfg.minSapRegisterSol * 1_000_000_000);
  const agentPda = deriveAgentPda(kp.publicKey);
  const existingAgent = await connection.getAccountInfo(agentPda, 'confirmed');
  const usdcAccounts = await connection.getParsedTokenAccountsByOwner(kp.publicKey, { mint: USDC_MINT }, 'confirmed');
  const usdc = usdcAccounts.value.reduce((sum, { account }) => sum + Number(account.data.parsed.info.tokenAmount.uiAmountString || '0'), 0);

  if (!existingAgent && capLamports < minSapLamports) {
    const receipt = await writeReceipt({
      mode: 'live-blocked',
      createdAt: new Date().toISOString(),
      reason: 'hard cap below expected SAP registration cost',
      wallet: kp.publicKey.toBase58(),
      balanceLamports,
      hardCapSol: cfg.hardCapSol,
      minSapRegisterSol: cfg.minSapRegisterSol,
      agentPda: agentPda.toBase58(),
      usdc,
      observation,
    });
    throw new Error(`Refusing live SAP registration: HARD_CAP_SOL=${cfg.hardCapSol} is below expected ${cfg.minSapRegisterSol} SOL. Receipt: ${receipt}`);
  }

  if (usdc <= 0) {
    const receipt = await writeReceipt({
      mode: 'live-blocked',
      createdAt: new Date().toISOString(),
      reason: 'no SPL USDC for Ace x402 payment',
      wallet: kp.publicKey.toBase58(),
      balanceLamports,
      hardCapSol: cfg.hardCapSol,
      agentPda: agentPda.toBase58(),
      usdc,
      observation,
    });
    throw new Error(`Refusing paid Ace x402 call: wallet has 0 USDC. Receipt: ${receipt}`);
  }

  // The actual SAP register/update + Ace x402 call should be enabled only after a public HTTPS endpoint
  // is deployed and the cap/funds satisfy the guards above.
  const receipt = await writeReceipt({
    mode: 'live-ready-not-sent',
    createdAt: new Date().toISOString(),
    wallet: kp.publicKey.toBase58(),
    balanceLamports,
    hardCapSol: cfg.hardCapSol,
    agentPda: agentPda.toBase58(),
    usdc,
    observation,
  });
  console.log(JSON.stringify({ mode: 'live-ready-not-sent', receipt }, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
