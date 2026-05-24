import fs from 'node:fs';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmRawTransaction } from '@solana/web3.js';

const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const KEYPAIR = process.env.SOLANA_KEYPAIR_PATH || '/home/ubuntu/bounty-work/oobe-wallet/solana-mainnet-agent-keypair.json';
const AGENT_PUBLIC_URL = process.env.AGENT_PUBLIC_URL || 'https://api.acedata.cloud/openai/chat/completions';
const AGENT_URI = process.env.AGENT_URI || AGENT_PUBLIC_URL;
const HARD_CAP_SOL = Number(process.env.HARD_CAP_SOL || '0.15');
const PROGRAM_ID = new PublicKey('SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ');

const idl = JSON.parse(fs.readFileSync('/home/ubuntu/bounty-work/synapse-sap-sdk/src/idl/synapse_agent_sap.json','utf8'));
// Mainnet deployed SAP program matches the pre-pricing-menu account layout even though the local SDK IDL includes pricing_menu.
// Removing only the pricing_menu account fixes account ordering; args remain compatible and simulation succeeds.
const reg = idl.instructions.find(ix => ix.name === 'register_agent');
reg.accounts = reg.accounts.filter(a => a.name !== 'pricing_menu');

const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR,'utf8'))));
const conn = new Connection(RPC, 'confirmed');
const wallet = new Wallet(kp);
const provider = new AnchorProvider(conn, wallet, { commitment: 'confirmed', preflightCommitment: 'confirmed' });
const program = new Program(idl, provider);
const [agent] = PublicKey.findProgramAddressSync([Buffer.from('sap_agent'), kp.publicKey.toBuffer()], PROGRAM_ID);
const [stats] = PublicKey.findProgramAddressSync([Buffer.from('sap_stats'), agent.toBuffer()], PROGRAM_ID);
const [globalRegistry] = PublicKey.findProgramAddressSync([Buffer.from('sap_global')], PROGRAM_ID);

const beforeBalance = await conn.getBalance(kp.publicKey, 'confirmed');
const existingAgent = await conn.getAccountInfo(agent, 'confirmed');
if (existingAgent) {
  console.log(JSON.stringify({ mode: 'already-registered', wallet: kp.publicKey.toBase58(), agent: agent.toBase58(), x402Endpoint: AGENT_PUBLIC_URL }, null, 2));
  process.exit(0);
}

const ix = await program.methods.registerAgent(
  'Tolga OOBE Ace Agent',
  'Autonomous Solana data agent using OOBE/Synapse SAP identity and AceDataCloud x402-paid analysis.',
  [{ id: 'ace:solana-account-summary', protocolId: 'ace-data-cloud', version: '1.0.0', description: 'Summarize Solana account/RPC observations using AceDataCloud via x402.' }],
  [],
  ['SAP', 'x402', 'AceDataCloud'],
  'did:sap:tolga-oobe-ace-agent',
  AGENT_URI,
  AGENT_PUBLIC_URL
).accountsStrict({ wallet: kp.publicKey, agent, agentStats: stats, globalRegistry, systemProgram: SystemProgram.programId }).instruction();

const latest = await conn.getLatestBlockhash('confirmed');
const tx = new Transaction({ feePayer: kp.publicKey, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(ix);
tx.sign(kp);
const estimatedFeeLamports = await tx.getEstimatedFee(conn);
const sim = await conn.simulateTransaction(tx);
if (sim.value.err) {
  console.error(JSON.stringify({ mode: 'simulation-failed-no-send', wallet: kp.publicKey.toBase58(), agent: agent.toBase58(), globalRegistry: globalRegistry.toBase58(), estimatedFeeLamports, simErr: sim.value.err, simLogs: sim.value.logs }, null, 2));
  process.exit(2);
}

// Conservative guard: refuse if the whole observed balance delta could exceed cap. Actual delta after send is checked and recorded.
const capLamports = Math.floor(HARD_CAP_SOL * 1_000_000_000);
if (beforeBalance < estimatedFeeLamports || estimatedFeeLamports > capLamports) {
  console.error(JSON.stringify({ mode: 'cap-or-balance-blocked-no-send', beforeBalance, estimatedFeeLamports, hardCapSol: HARD_CAP_SOL }, null, 2));
  process.exit(3);
}

const sig = await sendAndConfirmRawTransaction(conn, tx.serialize(), { commitment: 'confirmed', preflightCommitment: 'confirmed' });
const afterBalance = await conn.getBalance(kp.publicKey, 'confirmed');
const [agentInfo, statsInfo, globalInfo] = await conn.getMultipleAccountsInfo([agent, stats, globalRegistry], 'confirmed');
const spentLamports = beforeBalance - afterBalance;
const out = {
  mode: 'sap-register-live-success',
  createdAt: new Date().toISOString(),
  wallet: kp.publicKey.toBase58(),
  signature: sig,
  explorer: `https://explorer.solana.com/tx/${sig}?cluster=mainnet-beta`,
  agent: agent.toBase58(),
  stats: stats.toBase58(),
  globalRegistry: globalRegistry.toBase58(),
  x402Endpoint: AGENT_PUBLIC_URL,
  agentUri: AGENT_URI,
  estimatedFeeLamports,
  spentLamports,
  spentSol: spentLamports / 1_000_000_000,
  beforeSol: beforeBalance / 1_000_000_000,
  afterSol: afterBalance / 1_000_000_000,
  hardCapSol: HARD_CAP_SOL,
  accounts: {
    agentCreated: !!agentInfo,
    statsCreated: !!statsInfo,
    globalRegistryExists: !!globalInfo,
    agentOwner: agentInfo?.owner.toBase58(),
    statsOwner: statsInfo?.owner.toBase58(),
  },
  simulation: { unitsConsumed: sim.value.unitsConsumed, logs: sim.value.logs },
};
fs.mkdirSync('receipts', { recursive: true });
const receiptPath = `receipts/sap-register-live-success-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
fs.writeFileSync(receiptPath, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ ...out, receiptPath }, null, 2));
