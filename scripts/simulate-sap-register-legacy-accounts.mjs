import fs from 'node:fs';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

const RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const KEYPAIR = process.env.SOLANA_KEYPAIR_PATH || '/home/ubuntu/bounty-work/oobe-wallet/solana-mainnet-agent-keypair.json';
const AGENT_PUBLIC_URL = process.env.AGENT_PUBLIC_URL || 'https://example.invalid/oobe-ace-agent';
const PROGRAM_ID = new PublicKey('SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ');
const idl = JSON.parse(fs.readFileSync('/home/ubuntu/bounty-work/synapse-sap-sdk/src/idl/synapse_agent_sap.json','utf8'));
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

const ix = await program.methods.registerAgent(
  'Tolga OOBE Ace Agent',
  'Autonomous Solana data agent using OOBE/Synapse SAP identity and AceDataCloud x402-paid analysis.',
  [{ id: 'ace:solana-account-summary', protocolId: 'ace-data-cloud', version: '1.0.0', description: 'Summarize Solana account/RPC observations using AceDataCloud via x402.' }],
  [],
  ['SAP', 'x402', 'AceDataCloud'],
  'did:sap:tolga-oobe-ace-agent',
  AGENT_PUBLIC_URL,
  AGENT_PUBLIC_URL
).accountsStrict({ wallet: kp.publicKey, agent, agentStats: stats, globalRegistry, systemProgram: SystemProgram.programId }).instruction();

const latest = await conn.getLatestBlockhash('confirmed');
const tx = new Transaction({ feePayer: kp.publicKey, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }).add(ix);
tx.sign(kp);
const fee = await tx.getEstimatedFee(conn);
const sim = await conn.simulateTransaction(tx);
const infos = await conn.getMultipleAccountsInfo([agent, stats, globalRegistry], 'confirmed');
console.log(JSON.stringify({
  wallet: kp.publicKey.toBase58(),
  accountsSent: ix.keys.map((k, i) => ({ i, pubkey: k.pubkey.toBase58(), isWritable: k.isWritable, isSigner: k.isSigner })),
  agent: agent.toBase58(), stats: stats.toBase58(), globalRegistry: globalRegistry.toBase58(),
  estimatedFeeLamports: fee,
  existing: { agent: !!infos[0], stats: !!infos[1], globalRegistry: !!infos[2] },
  simErr: sim.value.err,
  simLogs: sim.value.logs,
  unitsConsumed: sim.value.unitsConsumed,
}, null, 2));
