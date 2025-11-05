export type Transaction = {
  id: string;
  userId: string;
  value: number;
  date: string; // ISO string
  category: string; // Name of the category for display
  categoryId: string; // ID of the category for relations
  account: string; // Name of the account for display
  accountId: string; // ID of the account for relations
  description: string;
  groupId?: string;
  installments?: {
    current: number;
    total: number;
  };
  type: 'income' | 'expense';
  status: 'PAID' | 'PENDING' | 'RECEIVED' | 'LATE';
};

export type Account = {
  id: string;
  userId: string;
  name: string;
  type: 'ContaCorrente' | 'CartaoCredito' | 'Investimento' | 'Outro';
  balance: number;
  limit?: number;
};

export type Category = {
  id: string;
  userId: string;
  name: string;
  color: string;
  type: 'income' | 'expense';
};

export type Budget = {
  id: string;
  userId: string;
  limit: number;
  month: string; // YYYY-MM
};

export type Goal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // ISO string
};

export type User = {
    id: string;
    name: string;
    phoneNumber: string;
    createdAt: string;
}
    