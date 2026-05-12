'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { Group, Expense, Member, Debt } from '@/lib/types';
import { getBalances, getDebts } from '@/lib/balances';
import SettleModal from '@/components/SettleModal';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(m => m.WalletMultiButton),
  { ssr: false }
);

const INITIAL_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'Goa Trip',
    emoji: '🏝️',
    members: [
      { name: 'Ravi', wallet: 'So11111111111111111111111111111111111111112' },
      { name: 'Priya', wallet: 'So11111111111111111111111111111111111111112' },
      { name: 'Arjun', wallet: 'So11111111111111111111111111111111111111112' },
      { name: 'You', wallet: '' }, // filled from connected wallet
    ],
    expenses: [
      { id: 'e1', desc: 'Hotel Booking', amtSol: 0.08, paidBy: 'Ravi', cat: '🏨', date: 'May 8' },
      { id: 'e2', desc: 'Beach Shack Dinner', amtSol: 0.03, paidBy: 'You', cat: '🍽️', date: 'May 9' },
      { id: 'e3', desc: 'Taxi from Airport', amtSol: 0.02, paidBy: 'Priya', cat: '🚗', date: 'May 8' },
    ],
  },
  {
    id: 'g2',
    name: 'Flat Expenses',
    emoji: '🏠',
    members: [
      { name: 'Karan', wallet: 'So11111111111111111111111111111111111111112' },
      { name: 'Neha', wallet: 'So11111111111111111111111111111111111111112' },
      { name: 'You', wallet: '' },
    ],
    expenses: [
      { id: 'e4', desc: 'Electricity Bill', amtSol: 0.01, paidBy: 'You', cat: '⚡', date: 'May 1' },
      { id: 'e5', desc: 'Groceries', amtSol: 0.015, paidBy: 'Karan', cat: '🛒', date: 'May 5' },
    ],
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function Home() {
  const { publicKey } = useWallet();
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [currentGroupId, setCurrentGroupId] = useState('g1');
  const [settleDebt, setSettleDebt] = useState<Debt | null>(null);
  const [settledMap, setSettledMap] = useState<Record<string, string>>({}); // key → txSig

  // Modals
  const [showExpModal, setShowExpModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Form state
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expCat, setExpCat] = useState('🍽️');
  const [memberName, setMemberName] = useState('');
  const [memberWallet, setMemberWallet] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('');

  const group = groups.find(g => g.id === currentGroupId)!;

  // Keep "You" wallet in sync with connected wallet
  const groupsWithWallet = groups.map(g => ({
    ...g,
    members: g.members.map(m =>
      m.name === 'You' ? { ...m, wallet: publicKey?.toBase58() ?? '' } : m
    ),
  }));
  const currentGroup = groupsWithWallet.find(g => g.id === currentGroupId)!;
  const balances = getBalances(currentGroup);
  const debts = getDebts(currentGroup);
  const total = currentGroup.expenses.reduce((s, e) => s + e.amtSol, 0);
  const youBal = balances['You'] ?? 0;

  const addExpense = useCallback(() => {
    const amt = parseFloat(expAmt);
    if (!expDesc.trim() || isNaN(amt) || amt <= 0) return;
    const exp: Expense = {
      id: uid(),
      desc: expDesc.trim(),
      amtSol: amt,
      paidBy: expPaidBy || group.members[0].name,
      cat: expCat,
      date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    };
    setGroups(gs => gs.map(g => g.id === currentGroupId ? { ...g, expenses: [...g.expenses, exp] } : g));
    setShowExpModal(false);
    setExpDesc(''); setExpAmt('');
  }, [expDesc, expAmt, expPaidBy, expCat, currentGroupId, group.members]);

  const addMember = useCallback(() => {
    if (!memberName.trim()) return;
    const m: Member = { name: memberName.trim(), wallet: memberWallet.trim() };
    setGroups(gs => gs.map(g => g.id === currentGroupId ? { ...g, members: [...g.members, m] } : g));
    setMemberName(''); setMemberWallet('');
  }, [memberName, memberWallet, currentGroupId]);

  const createGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    const g: Group = {
      id: uid(),
      name: newGroupName.trim(),
      emoji: newGroupEmoji.trim() || '👥',
      members: [{ name: 'You', wallet: publicKey?.toBase58() ?? '' }],
      expenses: [],
    };
    setGroups(gs => [...gs, g]);
    setCurrentGroupId(g.id);
    setShowGroupModal(false);
    setNewGroupName(''); setNewGroupEmoji('');
  }, [newGroupName, newGroupEmoji, publicKey]);

  const onSettled = useCallback((debt: Debt, txSig: string) => {
    const key = `${debt.from}→${debt.to}`;
    setSettledMap(m => ({ ...m, [key]: txSig }));
    setSettleDebt(null);
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0a0a0f',
    border: '0.5px solid rgba(255,255,255,0.14)',
    borderRadius: 9,
    padding: '10px 14px',
    color: 'var(--text)',
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
    marginTop: 6,
  };

  const btnStyle: React.CSSProperties = {
    fontFamily: 'inherit',
    fontSize: 13,
    padding: '9px 16px',
    borderRadius: 9,
    border: '0.5px solid rgba(255,255,255,0.14)',
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
  };

  const btnPrimary: React.CSSProperties = {
    ...btnStyle,
    background: 'var(--accent)',
    border: 'none',
    color: '#fff',
    fontWeight: 600,
  };

  const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const modalBox: React.CSSProperties = {
    background: 'var(--surface)',
    border: '0.5px solid rgba(255,255,255,0.14)',
    borderRadius: 18, padding: 28, width: 420,
    maxWidth: 'calc(100vw - 32px)',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '0.5px solid var(--border)',
        background: 'rgba(10,10,15,0.95)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%', marginRight: 8 }} />
            PayTrace
          </span>
          <span style={{
            fontSize: 11, fontFamily: 'monospace',
            background: 'rgba(124,111,252,0.12)', color: '#a78bfa',
            border: '0.5px solid rgba(124,111,252,0.3)',
            padding: '3px 10px', borderRadius: 99,
          }}>
            Solana Devnet
          </span>
        </div>
        <WalletMultiButton />
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 'calc(100vh - 57px)' }}>

        {/* SIDEBAR */}
        <div style={{ borderRight: '0.5px solid var(--border)', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', padding: '8px 8px 6px', fontFamily: 'monospace' }}>
            Groups
          </div>

          {groups.map(g => (
            <div key={g.id}
              onClick={() => setCurrentGroupId(g.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 10px', borderRadius: 10, cursor: 'pointer',
                background: currentGroupId === g.id ? 'var(--surface2)' : 'transparent',
                border: `0.5px solid ${currentGroupId === g.id ? 'rgba(255,255,255,0.14)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                {g.emoji}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{g.members.length} members</div>
              </div>
            </div>
          ))}

          <div
            onClick={() => setShowGroupModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 10px', borderRadius: 10, cursor: 'pointer',
              color: 'var(--muted)', fontSize: 13,
              border: '0.5px dashed rgba(255,255,255,0.14)',
              marginTop: 4, transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 18 }}>+</span> New group
          </div>
        </div>

        {/* MAIN */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Group header */}
          <div style={{ padding: '20px 28px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{currentGroup.emoji} {currentGroup.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>
                {currentGroup.members.map(m => m.name).join(' · ')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnStyle} onClick={() => setShowMemberModal(true)}>+ Member</button>
              <button style={btnPrimary} onClick={() => { setExpPaidBy(currentGroup.members[0].name); setShowExpModal(true); }}>+ Expense</button>
            </div>
          </div>

          {/* Balance strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '16px 28px', borderBottom: '0.5px solid var(--border)' }}>
            {[
              { label: 'Total Spent', value: `◎ ${total.toFixed(4)}`, color: 'var(--text)' },
              { label: 'You Are Owed', value: `◎ ${youBal > 0 ? youBal.toFixed(4) : '0.0000'}`, color: 'var(--green)' },
              { label: 'You Owe', value: `◎ ${youBal < 0 ? Math.abs(youBal).toFixed(4) : '0.0000'}`, color: 'var(--red)' },
            ].map(c => (
              <div key={c.label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, letterSpacing: -1, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', flex: 1 }}>

            {/* Expenses */}
            <div style={{ padding: '20px 28px', borderRight: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Expenses</div>
              {currentGroup.expenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 13, fontFamily: 'monospace' }}>
                  No expenses yet — add one!
                </div>
              ) : currentGroup.expenses.map(exp => (
                <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {exp.cat}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{exp.desc}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>
                      {exp.date} · {currentGroup.members.length} people
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace' }}>◎ {exp.amtSol.toFixed(4)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', marginTop: 2 }}>
                      ◎ {(exp.amtSol / currentGroup.members.length).toFixed(4)}/person
                    </div>
                    <div style={{
                      fontSize: 11, background: 'rgba(124,111,252,0.12)', color: '#a78bfa',
                      border: '0.5px solid rgba(124,111,252,0.2)', borderRadius: 99,
                      padding: '2px 8px', marginTop: 4, display: 'inline-block',
                    }}>
                      {exp.paidBy}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Settle panel */}
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Settle Up</div>

              {debts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--muted)', fontSize: 12, fontFamily: 'monospace' }}>
                  ✅ All settled!
                </div>
              ) : debts.map((d, i) => {
                const key = `${d.from}→${d.to}`;
                const txSig = settledMap[key];
                return (
                  <div key={i} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13 }}>{d.from} <span style={{ color: 'var(--muted)' }}>→</span> {d.to}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', fontFamily: 'monospace', marginTop: 2 }}>
                          ◎ {d.amtSol.toFixed(4)}
                        </div>
                      </div>
                      {txSig ? (
                        <a href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'monospace', textDecoration: 'none' }}>
                          ✓ On-chain ↗
                        </a>
                      ) : (
                        <button
                          onClick={() => setSettleDebt(d)}
                          style={{ ...btnStyle, fontSize: 11, padding: '5px 10px', borderRadius: 7 }}
                        >
                          Settle
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  On-chain Settlement
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Every settlement is a real Solana transaction on devnet — verifiable forever on the blockchain.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {showExpModal && (
        <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowExpModal(false); }}>
          <div style={modalBox}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Add Expense</div>
            {[
              { label: 'Description', el: <input style={inputStyle} placeholder="e.g. Hotel booking" value={expDesc} onChange={e => setExpDesc(e.target.value)} /> },
              { label: 'Amount (SOL)', el: <input style={inputStyle} type="number" placeholder="0.0000" step="0.0001" min="0" value={expAmt} onChange={e => setExpAmt(e.target.value)} /> },
              { label: 'Paid By', el: (
                <select style={inputStyle} value={expPaidBy} onChange={e => setExpPaidBy(e.target.value)}>
                  {currentGroup.members.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              )},
              { label: 'Category', el: (
                <select style={inputStyle} value={expCat} onChange={e => setExpCat(e.target.value)}>
                  {['🍽️ Food','🏨 Stay','🚗 Transport','🎉 Fun','🛒 Groceries','⚡ Utilities'].map(c => (
                    <option key={c} value={c.split(' ')[0]}>{c}</option>
                  ))}
                </select>
              )},
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</div>
                {f.el}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btnStyle} onClick={() => setShowExpModal(false)}>Cancel</button>
              <button style={btnPrimary} onClick={addExpense}>Add Expense</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showMemberModal && (
        <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowMemberModal(false); }}>
          <div style={modalBox}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Add Member</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>Name</div>
              <input style={inputStyle} placeholder="e.g. Sneha" value={memberName} onChange={e => setMemberName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>Solana Wallet Address</div>
              <input style={inputStyle} placeholder="e.g. 7xKXt..." value={memberWallet} onChange={e => setMemberWallet(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', marginBottom: 8 }}>Current Members</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {currentGroup.members.map(m => (
                  <span key={m.name} style={{
                    fontSize: 12, background: 'rgba(124,111,252,0.12)', color: '#a78bfa',
                    border: '0.5px solid rgba(124,111,252,0.2)', borderRadius: 99, padding: '4px 12px', fontFamily: 'monospace',
                  }}>{m.name}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btnStyle} onClick={() => setShowMemberModal(false)}>Done</button>
              <button style={btnPrimary} onClick={addMember}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW GROUP MODAL */}
      {showGroupModal && (
        <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowGroupModal(false); }}>
          <div style={modalBox}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>New Group</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>Group Name</div>
              <input style={inputStyle} placeholder="e.g. Weekend Trek" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>Emoji</div>
              <input style={inputStyle} placeholder="🏕️" maxLength={2} value={newGroupEmoji} onChange={e => setNewGroupEmoji(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btnStyle} onClick={() => setShowGroupModal(false)}>Cancel</button>
              <button style={btnPrimary} onClick={createGroup}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* SETTLE MODAL */}
      <SettleModal
        debt={settleDebt}
        onClose={() => setSettleDebt(null)}
        onSettled={onSettled}
      />
    </div>
  );
}