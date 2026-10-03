import type { Account, Transaction } from './definitions';

export function dayKey(value: Date | string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calendarDate(year: number, month: number, day: number) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last), 12);
}

export function hasCardCycle(account: Account) {
  return account.type === 'CartaoCredito' && [account.closingDay, account.dueDay]
    .every(day => Number.isInteger(day) && day! >= 1 && day! <= 31);
}

/** Closing-day purchases belong to the closing invoice; short months clamp to their last day. */
export function cardCycle(account: Account, purchaseDate: string | Date) {
  if (!hasCardCycle(account)) throw new Error('Configure os dias de fechamento e vencimento do cartão.');
  const purchase = new Date(purchaseDate);
  if (!Number.isFinite(purchase.getTime())) throw new Error('Data da compra inválida.');
  let closing = calendarDate(purchase.getFullYear(), purchase.getMonth(), account.closingDay!);
  if (dayKey(purchase) > dayKey(closing)) closing = calendarDate(purchase.getFullYear(), purchase.getMonth() + 1, account.closingDay!);
  return cycleFromClosing(account, closing);
}

function cycleFromClosing(account: Account, closing: Date) {
  let due = calendarDate(closing.getFullYear(), closing.getMonth(), account.dueDay!);
  if (dayKey(due) <= dayKey(closing)) due = calendarDate(closing.getFullYear(), closing.getMonth() + 1, account.dueDay!);
  return { invoiceMonth: dayKey(closing).slice(0, 7), invoiceClosingDate: dayKey(closing), invoiceDueDate: dayKey(due) };
}

export function prepareCardTransaction(transaction: Transaction, account: Account, seriesStart?: string): Transaction {
  if (account.type !== 'CartaoCredito') {
    const { invoiceMonth, invoiceClosingDate, invoiceDueDate, ...ordinary } = transaction;
    return ordinary;
  }
  if (transaction.type !== 'expense') throw new Error('Use uma conta bancária para receitas. Cartões recebem somente compras.');
  let cycle = cardCycle(account, transaction.date);
  if (seriesStart && transaction.installments) {
    const first = cardCycle(account, seriesStart);
    const [year, month] = first.invoiceMonth.split('-').map(Number);
    cycle = cycleFromClosing(account, calendarDate(year, month - 1 + transaction.installments.current - 1, account.closingDay!));
  }
  return { ...transaction, ...cycle, status: 'PENDING' };
}

export function transactionCycle(transaction: Transaction, account: Account, records: Transaction[] = []) {
  if (transaction.invoiceMonth && transaction.invoiceClosingDate && transaction.invoiceDueDate) {
    return { invoiceMonth: transaction.invoiceMonth, invoiceClosingDate: transaction.invoiceClosingDate, invoiceDueDate: transaction.invoiceDueDate };
  }
  if (!hasCardCycle(account) || transaction.type !== 'expense') return null;
  const first = transaction.groupId ? records.find(row => row.groupId === transaction.groupId && row.accountId === account.id && row.installments?.current === 1) : undefined;
  const prepared = prepareCardTransaction(transaction, account, first?.date);
  return { invoiceMonth: prepared.invoiceMonth!, invoiceClosingDate: prepared.invoiceClosingDate!, invoiceDueDate: prepared.invoiceDueDate! };
}

export function invoiceKey(cardId: string, cycle: { invoiceClosingDate: string; invoiceDueDate: string }) {
  return `${cardId}:${cycle.invoiceClosingDate}:${cycle.invoiceDueDate}`;
}

export type CardInvoice = {
  id: string; account: Account; month: string; closingDate: string; dueDate: string;
  transactions: Transaction[]; total: number; paid: number; remaining: number;
  state: 'open' | 'closed' | 'late' | 'paid';
};

export function buildCardInvoices(accounts: Account[], transactions: Transaction[], today = new Date()): CardInvoice[] {
  const cards = new Map(accounts.filter(account => account.type === 'CartaoCredito').map(account => [account.id, account]));
  const invoices = new Map<string, CardInvoice>();
  for (const row of transactions) {
    const account = cards.get(row.accountId);
    if (!account || row.type !== 'expense') continue;
    const cycle = transactionCycle(row, account, transactions);
    if (!cycle) continue;
    const id = invoiceKey(account.id, cycle);
    const invoice = invoices.get(id) ?? { id, account, month: cycle.invoiceMonth, closingDate: cycle.invoiceClosingDate,
      dueDate: cycle.invoiceDueDate, transactions: [], total: 0, paid: 0, remaining: 0, state: 'open' as const };
    invoice.transactions.push(row);
    invoices.set(id, invoice);
  }
  return [...invoices.values()].map(invoice => {
    const cents = invoice.transactions.reduce((sum, row) => sum + Math.round(Math.abs(row.value) * 100), 0);
    const paid = invoice.transactions.filter(row => row.status === 'PAID').reduce((sum, row) => sum + Math.round(Math.abs(row.value) * 100), 0);
    const remaining = cents - paid;
    const state = remaining === 0 ? 'paid' : dayKey(invoice.dueDate) < dayKey(today) ? 'late'
      : dayKey(invoice.closingDate) < dayKey(today) ? 'closed' : 'open';
    return { ...invoice, total: cents / 100, paid: paid / 100, remaining: remaining / 100, state } as CardInvoice;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.account.name.localeCompare(b.account.name));
}

/** A card purchase debits its funding account exactly once when its invoice is paid. */
export function accountBalance(account: Account, transactions: Transaction[], today = new Date()) {
  const cents = transactions.filter(row => ['PAID', 'RECEIVED'].includes(row.status)
    && (row.paidFromAccountId || row.accountId) === account.id
    && dayKey(row.paidAt || row.date) <= dayKey(today))
    .reduce((sum, row) => sum + Math.round(row.value * 100), Math.round(account.initialBalance * 100));
  return cents / 100;
}
