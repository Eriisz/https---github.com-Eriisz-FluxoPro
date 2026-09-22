'use client';

import { useEffect, useState } from 'react';
import type { FinanceInsights } from '@/lib/finance-engine';
import { buildInsights } from '@/lib/finance-engine';

type InsightsBannerProps = {
  income: number;
  expenses: number;
  categorySpending: Array<{ category: string; total: number }>;
  pendingExpenses: number;
  budget: number;
  spent: number;
};

export function InsightsBanner(props: InsightsBannerProps) {
  const [insights, setInsights] = useState<FinanceInsights>(() => buildInsights(props));

  useEffect(() => {
    const local = buildInsights(props);
    setInsights(local);
    const controller = new AbortController();
    fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(props),
    })
      .then((response) => response.json())
      .then((json) => {
        if (json?.ok && json.insights) setInsights(json.insights);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [props.income, props.expenses, props.pendingExpenses, props.budget, props.spent, props.categorySpending]);

  return (
    <div className="luxury-card grid gap-4 rounded-2xl p-5 md:grid-cols-[160px_1fr]">
      <div className="flex flex-col justify-center">
        <p className="text-[11px] tracking-[0.2em] text-primary">SCORE DO CAIXA</p>
        <p className="font-headline text-5xl text-primary">{insights.healthScore}</p>
        <p className="text-xs text-muted-foreground">Poupança {insights.savingsRate.toFixed(1)}%</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {insights.alerts.slice(0, 3).map((alert) => (
          <div key={alert.title} className="rounded-xl border border-primary/10 bg-background/40 p-3">
            <p className="text-sm font-semibold">{alert.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
