import { z } from 'zod';

export const BACKUP_COLLECTIONS = ['accounts', 'categories', 'budgets', 'goals', 'transactions'] as const;
const id = z.string().min(1).max(128).refine(v => !v.includes('/') && v !== '.' && v !== '..', 'Identificador inválido.');
const amount = z.number().finite().refine(v => Number.isSafeInteger(Math.round(v * 100)), 'Valor fora do limite.');
const date = z.string().datetime({ offset: true });
const owned = { id, userId: z.string().min(1) };
const backupSchema = z.object({
  accounts: z.array(z.object({ ...owned, name: z.string().min(1), type: z.enum(['ContaCorrente', 'CartaoCredito', 'Investimento', 'Outro']), initialBalance: amount, limit: amount.refine(v => v >= 0).nullable().optional() }).strict()),
  categories: z.array(z.object({ ...owned, name: z.string().min(1), type: z.enum(['income', 'expense']), color: z.string().min(1) }).strict()),
  budgets: z.array(z.object({ ...owned, limit: amount.refine(v => v >= 0), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).strict()),
  goals: z.array(z.object({ ...owned, name: z.string().min(1), targetAmount: amount.refine(v => v > 0), currentAmount: amount.refine(v => v >= 0), targetDate: date.nullable() }).strict()),
  transactions: z.array(z.object({ ...owned, value: amount, date, categoryId: z.string(), accountId: id, description: z.string().min(1), groupId: id.nullable().optional(), installments: z.object({ current: z.number().int().positive(), total: z.number().int().positive() }).strict().refine(v => v.current <= v.total).optional(), type: z.enum(['income', 'expense']), status: z.enum(['PAID', 'PENDING', 'RECEIVED', 'LATE']) }).strict()),
}).strict();
export type Backup = z.infer<typeof backupSchema>;

export function parseBackup(value: unknown): Backup {
  const result = backupSchema.safeParse(value);
  if (!result.success) throw new Error(`Backup inválido: confira ${result.error.issues[0].path.join('.') || 'a estrutura do arquivo'}. Nenhum dado foi alterado.`);
  const data = result.data;
  for (const name of BACKUP_COLLECTIONS) {
    const ids = data[name].map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error(`Backup contém IDs duplicados em ${name}.`);
  }
  const accounts = new Set(data.accounts.map(item => item.id));
  const categories = new Map(data.categories.map(item => [item.id, item.type]));
  for (const item of data.transactions) {
    if (!accounts.has(item.accountId)) throw new Error('Há transações com uma conta ausente no backup.');
    if (item.categoryId && categories.get(item.categoryId) !== item.type) throw new Error('Há transações com categoria ausente ou incompatível no backup.');
    if ((item.type === 'expense' && item.value > 0) || (item.type === 'income' && item.value < 0)) throw new Error('Há transações com sinal de valor incompatível com o tipo.');
  }
  return data;
}

export function backupRestorePlan(current: Record<(typeof BACKUP_COLLECTIONS)[number], { id: string }[]>, next: Backup) {
  const operations = BACKUP_COLLECTIONS.flatMap(name => {
    const incoming = new Set(next[name].map(item => item.id));
    return [
      ...current[name].filter(item => !incoming.has(item.id)).map(item => ({ collection: name, id: item.id, data: null })),
      ...next[name].map(item => ({ collection: name, id: item.id, data: item })),
    ];
  });
  if (operations.length > 500) throw new Error('Esta restauração excede 500 operações. Nenhum dado foi alterado; use uma migração assistida para manter a restauração atômica.');
  return operations;
}
