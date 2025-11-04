export type Transaction = {
  id: string;
  userId: string;
  value: number;
  date: string; // ISO string
  category: string;
  account: string;
  description: string;
  groupId?: string;
  installments?: {
    current: number;
    total: number;
  };
  type: 'income' | 'expense';
};

export type Account = {
  id: string;
  userId: string;
  name: string;
  type: 'ContaCorrente' | 'CartaoCredito' | 'Investimento';
  balance: number;
  limit?: number;
};

export type Category = {
  id: string;
  userId: string;
  name: string;
  color: string;
};

export type Budget = {
  id: string;
  userId: string;
  category: string;
  limit: number;
  month: string; // YYYY-MM
};
