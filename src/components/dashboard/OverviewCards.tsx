'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Scale } from "lucide-react";
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useData } from '@/context/DataContext';

type OverviewCardsProps = {
    monthlyNet: number;
    income: number;
    expenses: number;
    budget: number;
    spent: number;
    pendingExpenses: number;
    pendingIncome: number;
}

export function OverviewCards({ monthlyNet, income, expenses, budget, spent, pendingExpenses, pendingIncome }: OverviewCardsProps) {
  const [budgetView, setBudgetView] = useState<'receivable' | 'difference' | 'budget' | 'pending'>('receivable');
  const { isBalanceVisible } = useData();
  const remainingBudget = budget - spent;
  const pendingDifference = pendingIncome - pendingExpenses;
  const viewTitles = {
    receivable: 'A receber (Mês)',
    difference: 'Diferença prevista',
    budget: 'Orçamento Restante',
    pending: 'Necessário para Quitar',
  };

  const hiddenValue = '•••••';

  return (
    <div className="dash-kpis">
      <Card className="luxury-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo do Mês
          </CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${monthlyNet >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {isBalanceVisible ? formatCurrency(monthlyNet) : hiddenValue}
          </div>
          <p className="text-xs text-muted-foreground">
            Receitas recebidas menos despesas pagas
          </p>
        </CardContent>
      </Card>
      <Card className="luxury-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Receitas (Mês)
          </CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{isBalanceVisible ? formatCurrency(income) : hiddenValue}</div>
          <p className="text-xs text-muted-foreground">
            Receitas recebidas no mês selecionado
          </p>
        </CardContent>
      </Card>
      <Card className="luxury-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Despesas (Mês)
          </CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{isBalanceVisible ? formatCurrency(Math.abs(expenses)) : hiddenValue}</div>
           <p className="text-xs text-muted-foreground">
            Pagas, pendentes, atrasadas e a vencer no mês
          </p>
        </CardContent>
      </Card>
      <Card className="luxury-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {viewTitles[budgetView]}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Escolher análise do mês">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setBudgetView('receivable')}>Valor a receber</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setBudgetView('difference')}>Analisar diferença</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setBudgetView('pending')}>Necessário para quitar</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setBudgetView('budget')}>Orçamento restante</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {budgetView === 'receivable' ? (
            <>
              <div className="text-2xl font-bold text-primary">
                {isBalanceVisible ? formatCurrency(pendingIncome) : hiddenValue}
              </div>
              <p className="text-xs text-muted-foreground">
                Receitas pendentes, atrasadas e a vencer no mês
              </p>
              <Button variant="link" className="mt-1 h-auto p-0 text-xs" onClick={() => setBudgetView('difference')}>
                Analisar diferença
              </Button>
            </>
          ) : budgetView === 'difference' ? (
            <>
              <div className={`text-2xl font-bold ${isBalanceVisible && pendingDifference < 0 ? 'text-destructive' : 'text-primary'}`}>
                {isBalanceVisible ? formatCurrency(pendingDifference) : hiddenValue}
              </div>
              <p className="text-xs text-muted-foreground">A receber menos a pagar no mês</p>
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>A receber</dt><dd>{isBalanceVisible ? formatCurrency(pendingIncome) : hiddenValue}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>A pagar</dt><dd>{isBalanceVisible ? formatCurrency(pendingExpenses) : hiddenValue}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                {!isBalanceVisible ? 'Comparação das pendências do mês' : pendingDifference < 0
                  ? 'Falta para quitar as pendências'
                  : pendingDifference > 0 ? 'Sobra prevista após quitar as pendências' : 'Valores a receber e a pagar equilibrados'}
              </p>
              <Button variant="link" className="mt-1 h-auto p-0 text-xs" onClick={() => setBudgetView('receivable')}>
                Ver valor a receber
              </Button>
            </>
          ) : budgetView === 'budget' ? (
            <>
              <div className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {isBalanceVisible ? formatCurrency(remainingBudget) : hiddenValue}
              </div>
              <p className="text-xs text-muted-foreground">
                {isBalanceVisible ? `${formatCurrency(spent)} de ${formatCurrency(budget)} gastos` : '••••• de ••••• gastos'}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-destructive">
                {isBalanceVisible ? formatCurrency(pendingExpenses) : hiddenValue}
              </div>
              <p className="text-xs text-muted-foreground">
                Pendentes, atrasadas e a vencer no mês
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
