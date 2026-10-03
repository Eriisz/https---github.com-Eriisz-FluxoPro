import type { Budget, Transaction } from './definitions';
import { dayKey } from './cards';

export function budgetProgress(budget: Budget, transactions: Transaction[]) {
  const spent = transactions.filter(row => row.type === 'expense' && dayKey(row.date).slice(0, 7) === budget.month
    && (!budget.categoryId || row.categoryId === budget.categoryId))
    .reduce((sum, row) => sum + Math.round(Math.abs(row.value) * 100), 0) / 100;
  return { spent, remaining: Math.round((budget.limit - spent) * 100) / 100, percent: budget.limit > 0 ? spent / budget.limit * 100 : spent > 0 ? 100 : 0 };
}
