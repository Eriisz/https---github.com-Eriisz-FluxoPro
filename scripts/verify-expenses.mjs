function belongsToMonth(isoDate, monthDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
}

function isOpenExpenseStatus(status) {
  return status === 'PENDING' || status === 'LATE';
}

function sumMonthlyExpenses(transactions) {
  return transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + Math.abs(transaction.value || 0), 0);
}

function sumMonthlyPendingExpenses(transactions) {
  return transactions
    .filter((transaction) => transaction.type === 'expense' && isOpenExpenseStatus(transaction.status))
    .reduce((total, transaction) => total + Math.abs(transaction.value || 0), 0);
}

const selectedMonth = new Date(2026, 2, 10);
const laterThisMonth = new Date(2026, 2, 28, 12).toISOString();
const earlierThisMonth = new Date(2026, 2, 3, 12).toISOString();
const nextMonth = new Date(2026, 3, 2, 12).toISOString();

const monthTransactions = [
  { type: 'expense', status: 'PAID', value: -100, date: earlierThisMonth },
  { type: 'expense', status: 'PENDING', value: -50, date: earlierThisMonth },
  { type: 'expense', status: 'LATE', value: -25, date: earlierThisMonth },
  { type: 'expense', status: 'PENDING', value: -40, date: laterThisMonth },
  { type: 'income', status: 'RECEIVED', value: 200, date: earlierThisMonth },
  { type: 'expense', status: 'PENDING', value: -999, date: nextMonth },
].filter((transaction) => belongsToMonth(transaction.date, selectedMonth));

const expenses = sumMonthlyExpenses(monthTransactions);
const pending = sumMonthlyPendingExpenses(monthTransactions);

if (expenses !== 215) {
  throw new Error(`expected monthly expenses 215, got ${expenses}`);
}
if (pending !== 115) {
  throw new Error(`expected pending/late expenses 115, got ${pending}`);
}
if (monthTransactions.some((transaction) => transaction.value === -999)) {
  throw new Error('next-month expense leaked into the selected month');
}

console.log('monthly expense totals include paid, pending, late, and not-yet-due values', {
  expenses,
  pending,
});
