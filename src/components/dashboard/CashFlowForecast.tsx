'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/context/DataContext';
import type { Account, Transaction } from '@/lib/definitions';
import { buildCashFlowForecast } from '@/lib/finance-forecast';
import { formatCurrency } from '@/lib/utils';

function Metric({
  label,
  value,
  icon: Icon,
  tone,
  visible,
}: {
  label: string;
  value: number;
  icon: typeof TrendingUp;
  tone: 'positive' | 'negative' | 'neutral';
  visible: boolean;
}) {
  const toneClass = tone === 'positive'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'negative'
      ? 'text-destructive'
      : 'text-foreground';

  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon className={`h-4 w-4 ${toneClass}`} aria-hidden="true" />
      </div>
      <p className={`mt-2 text-xl font-semibold ${toneClass}`}>
        {visible ? formatCurrency(value) : '•••••'}
      </p>
    </div>
  );
}

export function CashFlowForecast({
  accounts,
  transactions,
}: {
  accounts: Account[];
  transactions: Transaction[];
}) {
  const { isBalanceVisible } = useData();
  const forecast = useMemo(
    () => buildCashFlowForecast(accounts, transactions),
    [accounts, transactions],
  );
  const endTone = forecast.endingBalance >= 0 ? 'positive' : 'negative';
  const lowTone = forecast.lowestBalance >= 0 ? 'neutral' : 'negative';

  return (
    <Card id="cash-flow-forecast" className="luxury-card">
      <CardHeader>
        <CardTitle>Previsão de fluxo de caixa</CardTitle>
        <CardDescription>
          Projeção para os próximos 90 dias usando saldos iniciais, movimentações confirmadas e transações pendentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Saldo projetado em 90 dias"
            value={forecast.endingBalance}
            icon={forecast.endingBalance >= forecast.startingBalance ? TrendingUp : TrendingDown}
            tone={endTone}
            visible={isBalanceVisible}
          />
          <Metric
            label="Menor saldo projetado"
            value={forecast.lowestBalance}
            icon={TrendingDown}
            tone={lowTone}
            visible={isBalanceVisible}
          />
          <div className="rounded-lg border bg-background/70 p-4">
            <p className="text-sm text-muted-foreground">Movimentações previstas</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                {isBalanceVisible ? formatCurrency(forecast.totalInflows) : '•••••'}
              </span>
              <span className="inline-flex items-center gap-1 text-destructive">
                <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                {isBalanceVisible ? formatCurrency(forecast.totalOutflows) : '•••••'}
              </span>
            </div>
          </div>
        </div>

        {forecast.points.length > 0 ? (
          <div className="h-[260px] w-full" role="img" aria-label="Gráfico do saldo de caixa projetado para os próximos 90 dias">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast.points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashFlowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  tickFormatter={(value: number) => isBalanceVisible ? formatCurrency(value) : ''}
                />
                <Tooltip
                  formatter={(value) => [
                    isBalanceVisible ? formatCurrency(Number(value)) : '•••••',
                    'Saldo projetado',
                  ]}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#cashFlowFill)"
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Adicione contas e transações para visualizar uma previsão.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Esta estimativa considera apenas transações futuras cadastradas. Ela não cria receitas ou despesas automaticamente.
        </p>
      </CardContent>
    </Card>
  );
}