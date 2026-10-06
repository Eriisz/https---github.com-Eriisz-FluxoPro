import { z } from 'zod';
import { isMoney, parseMoney, splitInstallments } from './money';
import { addMonths } from 'date-fns';
import { dayKey } from './cards';
import type { Transaction } from './definitions';

export const transactionFormSchema = z.object({
  description: z.string().trim().min(2, 'Descrição precisa ter ao menos 2 caracteres.'),
  value: z.string().refine(v => isMoney(v, 0.01), 'Informe um valor válido maior que zero.'),
  date: z.date(),
  accountId: z.string().min(1, 'Selecione uma conta.'),
  categoryId: z.string().min(1, 'Selecione uma categoria.'),
  type: z.enum(['income', 'expense']),
  status: z.enum(['PAID', 'PENDING', 'RECEIVED', 'LATE']),
  frequency: z.enum(['single', 'installment', 'recurring']).default('single'),
  installments: z.string().optional(),
  updateScope: z.enum(['current', 'future', 'all']).default('current'),
}).superRefine((data, ctx) => {
  if (data.frequency !== 'installment') return;
  const count = Number(data.installments);
  if (!/^\d+$/.test(data.installments || '') || !Number.isInteger(count) || count < 1 || count > 120) {
    ctx.addIssue({ code: 'custom', path: ['installments'], message: 'Informe de 1 a 120 parcelas inteiras.' });
  }
});
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

/** Editing occurrences keeps the series structure; only an explicit whole-group edit can rebuild it. */
export function preserveScopedRecurrence(data: TransactionFormValues, original?: Transaction): TransactionFormValues {
  if (!original?.groupId || data.updateScope === 'all') return data;
  return {
    ...data,
    frequency: original.installments ? 'installment' : 'recurring',
    installments: String(original.installments?.total ?? 24),
  };
}

export function transactionStatus(type: Transaction['type'], status: Transaction['status']): Transaction['status'] {
  return status === 'PAID' || status === 'RECEIVED' ? (type === 'income' ? 'RECEIVED' : 'PAID') : status;
}

export function buildTransactions(data: TransactionFormValues, userId: string, nextId: () => string): Transaction[] {
  const total = parseMoney(data.value);
  if (total === null || total <= 0) throw new Error('Valor inválido.');
  const count = data.frequency === 'recurring' ? 24 : data.frequency === 'installment' ? Number(data.installments) : 1;
  const amounts = data.frequency === 'installment' ? splitInstallments(total, count) : Array.from({ length: count }, () => total);
  const groupId = data.frequency !== 'single' ? nextId() : null;
  return amounts.map((value, index) => ({
    id: nextId(), userId, description: data.description,
    value: data.type === 'expense' ? -value : value,
    date: addMonths(data.date, index).toISOString(),
    accountId: data.accountId, categoryId: data.categoryId, type: data.type,
    // Future installments/repetitions start open even if the first one is settled.
    status: index === 0 ? transactionStatus(data.type, data.status) : 'PENDING',
    ...(groupId ? { groupId } : {}),
    ...(data.frequency === 'installment' && count > 1 ? { installments: { current: index + 1, total: count } } : {}),
  }));
}

export function editableStatus(transaction: Transaction): Transaction['status'] {
  return transaction.status === 'PENDING' && dayKey(transaction.invoiceDueDate || transaction.date) < dayKey(new Date()) ? 'LATE' : transaction.status;
}

/** Preserve individual amounts and settlement states when editing other group fields. */
export function transactionChanges(data: TransactionFormValues, original: Transaction, current: Transaction): Partial<Transaction> {
  const changes: Partial<Transaction> = {};
  for (const key of ['description', 'accountId', 'categoryId', 'type'] as const) {
    if (data[key] !== original[key]) Object.assign(changes, { [key]: data[key] });
  }
  const type = changes.type ?? current.type;
  const amount = parseMoney(data.value)!;
  if (amount !== Math.abs(original.value) || changes.type) {
    const magnitude = amount !== Math.abs(original.value) ? amount : Math.abs(current.value);
    changes.value = type === 'expense' ? -magnitude : magnitude;
  }
  if (data.status !== editableStatus(original) || changes.type) {
    changes.status = transactionStatus(type, data.status !== editableStatus(original) ? data.status : current.status);
  }
  return changes;
}
