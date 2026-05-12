export interface Member {
  name: string;
  wallet: string; // Solana public key string
}

export interface Expense {
  id: string;
  desc: string;
  amtSol: number;
  paidBy: string; // member name
  cat: string;
  date: string;
}

export interface Debt {
  from: string;
  to: string;
  toWallet: string;
  amtSol: number;
  settled: boolean;
  txSignature?: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  members: Member[];
  expenses: Expense[];
}