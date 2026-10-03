import type { Account, Transaction } from './definitions';
import { dayKey, transactionCycle } from './cards';

export interface CashFlowForecastPoint { label: string; date: string; balance: number; inflows: number; outflows: number; }
export interface CashFlowForecast {
  startingBalance: number; endingBalance: number; lowestBalance: number; lowestDate: string;
  totalInflows: number; totalOutflows: number; points: CashFlowForecastPoint[];
}

export function buildCashFlowForecast(accounts: Account[], transactions: Transaction[], referenceDate = new Date(), horizonDays = 90): CashFlowForecast {
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 366) throw new Error('Horizonte deve ter entre 1 e 366 dias.');
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 12);
  const end = new Date(today); end.setDate(end.getDate() + horizonDays);
  const accountMap = new Map(accounts.map(account => [account.id, account]));
  let initial = accounts.filter(account => account.type !== 'CartaoCredito').reduce((sum, account) => sum + Math.round(account.initialBalance * 100), 0);
  const flows = new Map<string, { incoming: number; outgoing: number }>();
  for (const row of transactions) {
    const account = accountMap.get(row.accountId);
    if (!account) continue;
    const settled = ['PAID', 'RECEIVED'].includes(row.status);
    if (settled && account.type === 'CartaoCredito' && !row.paidFromAccountId) continue; // Legacy payments have no known cash account.
    let date = row.paidAt || row.date;
    if (!settled && account.type === 'CartaoCredito') date = transactionCycle(row, account, transactions)?.invoiceDueDate || row.date;
    if (!Number.isFinite(new Date(date).getTime()) || !Number.isFinite(row.value)) continue;
    const cents = Math.round(row.value * 100);
    if (settled && dayKey(date) <= dayKey(today)) { initial += cents; continue; }
    if (dayKey(date) > dayKey(end)) continue;
    const key = dayKey(date) < dayKey(today) ? dayKey(today) : dayKey(date);
    const flow = flows.get(key) || { incoming: 0, outgoing: 0 };
    if (cents >= 0) flow.incoming += cents; else flow.outgoing -= cents;
    flows.set(key, flow);
  }
  let balance = initial, incoming = 0, outgoing = 0, lowest = initial;
  let lowestDate = today.toISOString();
  const points: CashFlowForecastPoint[] = [];
  for (let offset = 0; offset <= horizonDays; offset++) {
    const date = new Date(today); date.setDate(today.getDate() + offset);
    const flow = flows.get(dayKey(date)) || { incoming: 0, outgoing: 0 };
    balance += flow.incoming - flow.outgoing; incoming += flow.incoming; outgoing += flow.outgoing;
    if (balance < lowest) { lowest = balance; lowestDate = date.toISOString(); }
    points.push({ label: offset === 0 ? 'Hoje' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), date: date.toISOString(), balance: balance / 100, inflows: flow.incoming / 100, outflows: flow.outgoing / 100 });
  }
  return { startingBalance: initial / 100, endingBalance: balance / 100, lowestBalance: lowest / 100, lowestDate, totalInflows: incoming / 100, totalOutflows: outgoing / 100, points };
}
