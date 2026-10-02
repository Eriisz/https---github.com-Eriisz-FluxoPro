import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Execute the application's helpers instead of maintaining a copy of their logic.
const source = await readFile(new URL('../src/lib/finance-engine.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const {
  belongsToMonth,
  sumMonthlyExpenses,
  sumMonthlyPendingExpenses,
  sumMonthlyPendingIncome,
  sumSettledExpenses,
  sumSettledIncome,
  buildInsights,
} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const selectedMonth = new Date(2026, 2, 10);
const date = (month, day) => new Date(2026, month, day, 12).toISOString();
const transactions = [
  { type: 'expense', status: 'PAID', value: -100, date: date(2, 3) },
  { type: 'expense', status: 'PENDING', value: -50, date: date(2, 3) },
  { type: 'expense', status: 'LATE', value: -25, date: date(2, 3) },
  { type: 'expense', status: 'PENDING', value: -40, date: date(2, 28) },
  { type: 'income', status: 'RECEIVED', value: 200, date: date(2, 3) },
  { type: 'income', status: 'PENDING', value: 500, date: date(2, 28) },
  { type: 'income', status: 'LATE', value: 75, date: date(2, 3) },
  { type: 'income', status: 'PENDING', value: 999, date: date(3, 2) },
  { type: 'income', status: 'LATE', value: 888, date: date(1, 28) },
  { type: 'expense', status: 'PENDING', value: -999, date: date(3, 2) },
  { type: 'expense', status: 'LATE', value: -888, date: date(1, 28) },
];
const monthTransactions = transactions.filter((t) => belongsToMonth(t.date, selectedMonth));
const expenses = sumMonthlyExpenses(monthTransactions);
const pending = sumMonthlyPendingExpenses(monthTransactions);
const receivable = sumMonthlyPendingIncome(monthTransactions);
assert.equal(receivable, 575, 'include pending, late and upcoming income only in selected month');
assert.equal(receivable - pending, 460, 'compare remaining receivables and payables');
assert.equal(sumMonthlyPendingIncome([]), 0);
const allReceived = monthTransactions.map((t) => t.type === 'income' ? { ...t, status: 'RECEIVED' } : t);
assert.equal(sumMonthlyPendingIncome(allReceived), 0, 'received income no longer counts as receivable');
assert.equal(sumMonthlyPendingIncome(allReceived) - pending, -115, 'show a shortfall when nothing remains to receive');
assert.equal(sumMonthlyPendingIncome(transactions.filter((t) => belongsToMonth(t.date, new Date(2026, 3, 1)))), 999, 'changing month selects its receivables');

assert.equal(expenses, 215, 'include paid, pending, late and upcoming expenses');
assert.equal(pending, 115, 'exclude paid expenses and pending income from amount to settle');
assert.equal(sumSettledIncome(monthTransactions), 200);
assert.equal(sumSettledExpenses(monthTransactions), -100, 'cash balance only deducts paid expenses');
assert.equal(sumMonthlyExpenses(transactions.filter((t) => belongsToMonth(t.date, new Date(2026, 3, 1)))), 999, 'changing month selects its expenses');
assert.equal(belongsToMonth(date(2, 1), selectedMonth), true);
assert.equal(belongsToMonth(date(2, 31), selectedMonth), true);
assert.equal(belongsToMonth(new Date(2025, 2, 3, 12).toISOString(), selectedMonth), false);
assert.equal(belongsToMonth('invalid', selectedMonth), false);

const allPaid = monthTransactions.map((t) => t.type === 'expense' ? { ...t, status: 'PAID' } : t);
assert.equal(sumMonthlyExpenses(allPaid), expenses, 'paying an expense must not count it again');
assert.equal(sumMonthlyPendingExpenses(allPaid), 0);
assert.equal(sumMonthlyExpenses([{ type: 'expense', status: 'PENDING', value: 40 }]), 40, 'accept positive expense magnitudes');
assert.equal(sumMonthlyExpenses([]), 0);
assert.equal(sumMonthlyPendingExpenses([]), 0);

const insights = buildInsights({ income: 200, expenses, pendingExpenses: pending, budget: 200, spent: expenses, categorySpending: [] });
assert.equal(insights.net, -15, 'unpaid commitments affect the projected result');
assert.ok(insights.alerts.some((alert) => alert.title === 'Mês no vermelho'));
assert.ok(insights.alerts.some((alert) => alert.title === 'Pendências em aberto'));
console.log('Expense checks passed: monthly scope, all statuses, upcoming dates, payment transitions and insights.');
