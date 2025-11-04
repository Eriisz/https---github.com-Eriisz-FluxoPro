export type Transaction = {
  id: string;
  userId: string;
  value: number;
  date: string; // ISO string
  category: string; // Name of the category for display
  categoryId: string; // ID of the category for relations
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
  type: 'ContaCorrente' | 'CartaoCredito' | 'Investimento' | 'Outro';
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
  categoryId: string;
  limit: number;
  month: string; // YYYY-MM
};

export type User = {
    id: string;
    name: string;
    phoneNumber: string;
    createdAt: string;
}
