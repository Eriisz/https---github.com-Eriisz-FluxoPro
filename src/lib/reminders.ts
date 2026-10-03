import type { Account, Budget, Category, Transaction } from './definitions';
import { buildCardInvoices, dayKey } from './cards';
import { budgetProgress } from './budgets';
export type ReminderSettings = { enabled: boolean; daysAhead: number; budgetPercent: number; includeIncome: boolean };
export const defaultReminderSettings: ReminderSettings = { enabled: true, daysAhead: 3, budgetPercent: 80, includeIncome: true };
export function parseReminderSettings(value: unknown): ReminderSettings {
  if (!value || typeof value !== 'object') return { ...defaultReminderSettings };
  const data = value as Partial<ReminderSettings>;
  return {
    enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
    daysAhead: Number.isInteger(data.daysAhead) && data.daysAhead! >= 0 && data.daysAhead! <= 30 ? data.daysAhead! : 3,
    budgetPercent: [50, 70, 80, 90, 100].includes(data.budgetPercent!) ? data.budgetPercent! : 80,
    includeIncome: typeof data.includeIncome === 'boolean' ? data.includeIncome : true,
  };
}
export type Reminder = { id: string; title: string; detail: string; amount: number; href: string; urgent: boolean; date: string };
export function buildReminders(accounts: Account[], transactions: Transaction[], budgets: Budget[], categories: Category[], settings: ReminderSettings, now = new Date()): Reminder[] {
  if (!settings.enabled) return [];
  const end = new Date(now); end.setDate(now.getDate() + settings.daysAhead);
  const today = dayKey(now), last = dayKey(end);
  const reminders: Reminder[] = [];
  const invoices = buildCardInvoices(accounts, transactions, now);
  const covered = new Set(invoices.flatMap(invoice => invoice.transactions.map(row => row.id)));
  for (const row of transactions) {
    if (covered.has(row.id) || !['PENDING', 'LATE'].includes(row.status) || (!settings.includeIncome && row.type === 'income')) continue;
    if (!Number.isFinite(new Date(row.date).getTime())) continue;
    const due = dayKey(row.date);
    if (due > last) continue;
    reminders.push({ id: `transaction:${row.id}`, title: row.description, amount: Math.abs(row.value), date: due,
      detail: `${row.type === 'income' ? 'A receber' : 'A pagar'} · ${due < today ? 'em atraso' : due === today ? 'hoje' : 'a vencer'}`,
      href: '/history', urgent: due < today });
  }
  for (const invoice of invoices) {
    const due = dayKey(invoice.dueDate);
    if (invoice.remaining <= 0 || due > last) continue;
    reminders.push({ id: `invoice:${invoice.id}`, title: `Fatura · ${invoice.account.name}`, detail: due < today ? 'Fatura em atraso' : 'Vencimento da fatura', amount: invoice.remaining, date: due, href: '/cards', urgent: due < today });
  }
  for (const budget of budgets.filter(item => item.month === today.slice(0, 7))) {
    const progress = budgetProgress(budget, transactions);
    if (progress.percent < settings.budgetPercent) continue;
    reminders.push({ id: `budget:${budget.id}`, title: budget.categoryId ? `Orçamento · ${categories.find(item => item.id === budget.categoryId)?.name || 'Categoria'}` : 'Orçamento mensal',
      detail: progress.remaining < 0 ? 'Limite ultrapassado' : 'Próximo do limite', amount: progress.spent, href: '/budgets', date: today, urgent: progress.remaining < 0 });
  }
  return reminders.sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.date.localeCompare(b.date));
}
