import {
  PublicKey,
  Connection,
  clusterApiUrl,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import { encodeURL } from '@solana/pay';
import BigNumber from 'bignumber.js';

export const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

/**
 * Generates a Solana Pay URL for a debt settlement.
 * This URL can be encoded into a QR code — any Solana wallet app can scan it.
 */
export function generateSolanaPayURL(
  recipientAddress: string,
  amountSol: number,
  fromName: string,
  toName: string
): string {
  try {
    const recipient = new PublicKey(recipientAddress);
    const amount = new BigNumber(amountSol.toFixed(9));
    const url = encodeURL({
      recipient,
      amount,
      label: 'PayTrace',
      message: `${fromName} → ${toName} settlement`,
      memo: `paytrace:${fromName}:${toName}`,
    });
    return url.toString();
  } catch {
    return `solana:DEMO_WALLET?amount=${amountSol.toFixed(4)}&label=PayTrace&memo=demo`;
  }
}

/**
 * Sends a real SOL transfer on devnet using the connected wallet.
 * Built with raw web3.js — no @solana/pay createTransfer to avoid version conflicts.
 */
export async function sendSettlement(
  wallet: any,
  recipientAddress: string,
  amountSol: number,
  fromName: string,
  toName: string
): Promise<string> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  let recipient: PublicKey;
  try {
    recipient = new PublicKey(recipientAddress);
  } catch {
    throw new Error('Invalid recipient wallet address. Add a real devnet address for this member.');
  }

  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const transaction = new Transaction();

  // SOL transfer
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipient,
      lamports,
    })
  );

  // Memo instruction — writes PayTrace metadata on-chain
  const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const memo = `PayTrace: ${fromName} → ${toName} | ${amountSol.toFixed(4)} SOL`;
  transaction.add(
    new TransactionInstruction({
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf8'),
    })
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());

  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

  return signature;
}

export function getSolanaExplorerURL(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}