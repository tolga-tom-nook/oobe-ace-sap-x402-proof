import fs from 'node:fs';
import bs58 from 'bs58';
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import { cfg } from './config.js';

function parseSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) return Uint8Array.from(JSON.parse(trimmed));
  return bs58.decode(trimmed);
}

export function loadKeypair(): Keypair {
  if (cfg.solanaPrivateKey) return Keypair.fromSecretKey(parseSecretKey(cfg.solanaPrivateKey));
  if (!cfg.solanaKeypairPath) throw new Error('SOLANA_KEYPAIR_PATH is required for live signing');
  return Keypair.fromSecretKey(parseSecretKey(fs.readFileSync(cfg.solanaKeypairPath, 'utf8')));
}

export function asAceSolanaWallet(kp: Keypair, connection: Connection, spendGuardLamports: bigint) {
  return {
    publicKey: kp.publicKey,
    async signAndSendTransaction(tx: Transaction) {
      if (!tx.feePayer) tx.feePayer = kp.publicKey;
      if (!tx.recentBlockhash) {
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
      }
      tx.sign(kp);
      const fee = await tx.getEstimatedFee(connection);
      if (fee !== null && BigInt(fee) > spendGuardLamports) {
        throw new Error(`Refusing to send transaction: estimated fee ${fee} lamports exceeds remaining guard ${spendGuardLamports}`);
      }
      const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
      await connection.confirmTransaction(signature, 'confirmed');
      return signature;
    },
  };
}
