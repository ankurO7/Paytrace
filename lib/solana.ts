import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { encodeURL, createTransfer } from '@solana/pay';
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
    const label = 'PayTrace';
    const message = `${fromName} → ${toName} settlement`;
    const memo = `paytrace:${fromName}:${toName}`;

    const url = encodeURL({ recipient, amount, label, message, memo });
    return url.toString();
  } catch {
    // If wallet address is invalid (demo mode), return a demo URL
    return `solana:DEMO_WALLET?amount=${amountSol.toFixed(4)}&label=PayTrace&memo=demo`;
  }
}

/**
 * Sends a real SOL transfer on devnet using the connected wallet.
 * Returns the transaction signature.
 */
export async function sendSettlement(
  wallet: any, // wallet adapter
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
    throw new Error('Invalid recipient wallet address');
  }

  const amount = new BigNumber(amountSol.toFixed(9));
  const memo = `PayTrace: ${fromName} → ${toName}`;

  const transaction = await createTransfer(connection, wallet.publicKey, {
    recipient,
    amount,
    memo,
  });

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
}

export function getSolanaExplorerURL(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}