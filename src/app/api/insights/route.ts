import { NextResponse } from 'next/server';
import { buildInsights } from '@/lib/finance-engine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const insights = buildInsights({
      income: Number(body.income) || 0,
      expenses: Number(body.expenses) || 0,
      previousNet: typeof body.previousNet === 'number' ? body.previousNet : undefined,
      categorySpending: Array.isArray(body.categorySpending) ? body.categorySpending : [],
      pendingExpenses: Number(body.pendingExpenses) || 0,
      budget: typeof body.budget === 'number' ? body.budget : undefined,
      spent: typeof body.spent === 'number' ? body.spent : undefined,
    });

    return NextResponse.json({
      ok: true,
      engine: 'fluxopro-insights-v2',
      insights,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível gerar insights.' }, { status: 400 });
  }
}
