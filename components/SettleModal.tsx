'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Debt } from '@/lib/types';
import { generateSolanaPayURL, sendSettlement, getSolanaExplorerURL } from '@/lib/solana';

interface Props {
  debt: Debt | null;
  onClose: () => void;
  onSettled: (debt: Debt, txSig: string) => void;
}

type Step = 'qr' | 'sending' | 'done' | 'error';

export default function SettleModal({ debt, onClose, onSettled }: Props) {
  const wallet = useWallet();
  const [step, setStep] = useState<Step>('qr');
  const [txSig, setTxSig] = useState('');
  const [error, setError] = useState('');

  // Reset state every time a new debt is opened
  useEffect(() => {
    if (debt) {
      setStep('qr');
      setTxSig('');
      setError('');
    }
  }, [debt]);

  if (!debt) return null;

  const payURL = generateSolanaPayURL(debt.toWallet, debt.amtSol, debt.from, debt.to);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payURL)}`;

  const handleSendOnChain = async () => {
    if (!wallet.connected) {
      setError('Please connect your Phantom wallet first.');
      setStep('error');
      return;
    }
    setStep('sending');
    setError('');
    try {
      const sig = await sendSettlement(wallet, debt.toWallet, debt.amtSol, debt.from, debt.to);
      setTxSig(sig);
      setStep('done');
      onSettled(debt, sig);
    } catch (e: any) {
      setError(e.message || 'Transaction failed.');
      setStep('error');
    }
  };

  const btn: React.CSSProperties = {
    fontFamily: 'inherit', fontSize: 13, padding: '9px 16px',
    borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.14)',
    background: 'transparent', color: 'var(--text)', cursor: 'pointer',
  };
  const btnPrimary: React.CSSProperties = { ...btn, background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600 };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface)', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: 18, padding: 28, width: 420, maxWidth: 'calc(100vw - 32px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Settle Payment</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {debt.from} owes {debt.to} ◎{debt.amtSol.toFixed(4)}
          </div>
        </div>

        {/* QR / Error step */}
        {(step === 'qr' || step === 'error') && (
          <>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <img src={qrSrc} alt="Solana Pay QR Code" width={200} height={200} style={{ display: 'block' }} />
            </div>

            <div style={{ background: 'var(--bg)', border: '0.5px solid rgba(34,211,165,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'monospace', marginBottom: 4 }}>◎ Solana Pay QR</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {payURL.slice(0, 90)}...
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Scan with any Solana wallet app — or click <strong style={{ color: 'var(--text)' }}>Send from Wallet</strong> to pay directly from Phantom.
            </div>

            {step === 'error' && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={btn}>Cancel</button>
              <button onClick={handleSendOnChain} style={btnPrimary}>Send from Wallet ↗</button>
            </div>
          </>
        )}

        {/* Sending */}
        {step === 'sending' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Broadcasting transaction...</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Confirm in your Phantom wallet popup</div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>Settled on-chain!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Transaction confirmed on Solana devnet</div>
            <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all', marginBottom: 20, textAlign: 'left' }}>
              {txSig}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={onClose} style={btn}>Close</button>
              <a href={getSolanaExplorerURL(txSig)} target="_blank" rel="noreferrer"
                style={{ ...btnPrimary, background: 'var(--green)', color: '#051a12', textDecoration: 'none', display: 'inline-block' }}>
                View on Explorer ↗
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}