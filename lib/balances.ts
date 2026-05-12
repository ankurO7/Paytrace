import { Group, Debt } from './types';

export function getBalances(group: Group): Record<string, number> {
  const n = group.members.length;
  const bal: Record<string, number> = {};
  group.members.forEach(m => (bal[m.name] = 0));

  group.expenses.forEach(exp => {
    const share = exp.amtSol / n;
    group.members.forEach(m => {
      if (m.name === exp.paidBy) bal[m.name] += exp.amtSol - share;
      else bal[m.name] -= share;
    });
  });

  return bal;
}

export function getDebts(group: Group): Debt[] {
  const bal = getBalances(group);
  const debts: Debt[] = [];

  const pos = group.members
    .filter(m => bal[m.name] > 0.000001)
    .map(m => ({ name: m.name, amt: bal[m.name], wallet: m.wallet }))
    .sort((a, b) => b.amt - a.amt);

  const neg = group.members
    .filter(m => bal[m.name] < -0.000001)
    .map(m => ({ name: m.name, amt: -bal[m.name], wallet: m.wallet }))
    .sort((a, b) => b.amt - a.amt);

  let i = 0, j = 0;
  while (i < pos.length && j < neg.length) {
    const pay = Math.min(pos[i].amt, neg[j].amt);
    if (pay > 0.000001) {
      debts.push({
        from: neg[j].name,
        to: pos[i].name,
        toWallet: pos[i].wallet,
        amtSol: pay,
        settled: false,
      });
    }
    pos[i].amt -= pay;
    neg[j].amt -= pay;
    if (pos[i].amt < 0.000001) i++;
    if (neg[j].amt < 0.000001) j++;
  }

  return debts;
}