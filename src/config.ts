import 'dotenv/config';

export const cfg = {
  dryRun: process.env.DRY_RUN !== '0',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY || '',
  solanaKeypairPath: process.env.SOLANA_KEYPAIR_PATH || '/home/ubuntu/bounty-work/oobe-wallet/solana-mainnet-agent-keypair.json',
  agentPublicUrl: process.env.AGENT_PUBLIC_URL || '',
  aceNetwork: (process.env.ACE_X402_NETWORK || 'solana') as 'solana' | 'base' | 'skale',
  maxUsdcMicro: BigInt(process.env.MAX_USDC_MICRO || '200000'),
  hardCapSol: Number(process.env.HARD_CAP_SOL || '0.05'),
  minSapRegisterSol: Number(process.env.MIN_SAP_REGISTER_SOL || '0.1'),
};

export function requireLiveEnv() {
  if (cfg.dryRun) return;
  if (!cfg.solanaPrivateKey && !cfg.solanaKeypairPath) {
    throw new Error('Missing SOLANA_PRIVATE_KEY or SOLANA_KEYPAIR_PATH for live signing');
  }
  if (!cfg.agentPublicUrl) throw new Error('Missing required env AGENT_PUBLIC_URL');
  if (cfg.hardCapSol <= 0) throw new Error('HARD_CAP_SOL must be set to a positive amount');
}
