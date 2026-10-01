import type { Account, Transaction } from '@/lib/definitions';

export interface CashFlowForecastPoint {
  label: string;
  date: string;
  balance: number;
  inflows: number;
  outflows: number;
}

export interface CashFlowForecast {
  startingBalance: number;
  endingBalance: number;
  lowestBalance: number;
  totalInflows: number;
  totalOutflows: number;
  points: CashFlowForecastPoint[];
}

const settledStatuses = new Set(['PAID', 'RECEIVED']);
const pendingStatuses = new Set(['PENDING', 'LATE']);
const DAY_MS = 24 * 60 * 60 * 1000;

function localDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function buildCashFlowForecast(
  accounts: Pick<Account, 'initialBalance'>[],
  transactions: Transaction[],
  referenceDate = new Date(),
  horizonDays = 90,
): CashFlowForecast {
  const today = localDay(referenceDate);
  const endDate = new Date(today.getTime() + horizonDays * DAY_MS);
  const weekCount = Math.ceil(horizonDays / 7);

  const startingBalance = accounts.reduce(
    (total, account) => total + (Number.isFinite(account.initialBalance) ? account.initialBalance : 0),
    0,
  ) + transactions.reduce((total, transaction) => {
    const transactionDate = new Date(transaction.date);
    if (
      settledStatuses.has(transaction.status) &&
      !Number.isNaN(transactionDate.getTime()) &&
      localDay(transactionDate) <= today
    ) {
      return total + transaction.value;
    }
    return total;
  }, 0);

  const weeklyFlows = Array.from({ length: weekCount }, () => ({ inflows: 0, outflows: 0 }));

  transactions.forEach((transaction) => {
    if (!pendingStatuses.has(transaction.status)) return;
    const transactionDate = new Date(transaction.date);
    if (Number.isNaN(transactionDate.getTime())) return;

    const dueDay = localDay(transactionDate);
    if (dueDay > endDate) return;
    const daysFromToday = Math.floor((dueDay.getTime() - today.getTime()) / DAY_MS);
    const weekIndex = Math.min(
      weekCount - 1,
      Math.max(0, Math.floor(Math.max(0, daysFromToday) / 7)),
    );
    const amount = Number.isFinite(transaction.value) ? transaction.value : 0;
    if (amount >= 0) weeklyFlows[weekIndex].inflows += amount;
    else weeklyFlows[weekIndex].outflows += Math.abs(amount);
  });

  let balance = startingBalance;
  let totalInflows = 0;
  let totalOutflows = 0;
  const points: CashFlowForecastPoint[] = [{
    label: 'Hoje',
    date: today.toISOString(),
    balance,
    inflows: 0,
    outflows: 0,
  }];

  weeklyFlows.forEach((flow, index) => {
    balance += flow.inflows - flow.outflows;
    totalInflows += flow.inflows;
    totalOutflows += flow.outflows;
    const daysAhead = Math.min((index + 1) * 7, horizonDays);
    const date = new Date(today.getTime() + daysAhead * DAY_MS);

    points.push({
      label: daysAhead === horizonDays
        ? `${horizonDays} dias`
        : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      date: date.toISOString(),
      balance,
      inflows: flow.inflows,
      outflows: flow.outflows,
    });
  });

  return {
    startingBalance,
    endingBalance: balance,
    lowestBalance: Math.min(startingBalance, ...points.map((point) => point.balance)),
    totalInflows,
    totalOutflows,
    points,
  };
}