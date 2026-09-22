import { NextResponse } from 'next/server';
import { EMPTY_FILTERS, filterTransactions, parseSearchQuery, searchWorkspace } from '@/lib/finance-engine';
import type { Account, Category, Goal, Transaction } from '@/lib/definitions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = String(body.query || '');
    const parsed = parseSearchQuery(query);

    const transactions = (body.transactions || []) as Transaction[];
    const accounts = (body.accounts || []) as Account[];
    const categories = (body.categories || []) as Category[];
    const goals = (body.goals || []) as Goal[];

    const hits = searchWorkspace({
      query,
      transactions,
      accounts,
      categories,
      goals,
      limit: 24,
    });

    const filtered = filterTransactions(transactions, categories, accounts, {
      ...EMPTY_FILTERS,
      ...body.filters,
      query,
      allPeriods: true,
    });

    return NextResponse.json({
      ok: true,
      engine: 'fluxopro-search-v2',
      parsed,
      total: filtered.length,
      hits,
      transactions: filtered.slice(0, 100),
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha na pesquisa.' }, { status: 400 });
  }
}
