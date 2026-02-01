'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Ban, Info, RefreshCw } from "lucide-react";
import { Button } from '../ui/button';
import { useData } from '@/context/DataContext';

type OverviewCardsProps = {
    balance: number;
    income: number;
    expenses: number;
    budget: number;
    spent: number;
    isCurrentMonth: boolean;
    pendingExpenses: number;
}

export function OverviewCards({ balance, income, expenses, budget, spent, isCurrentMonth, pendingExpenses }: OverviewCardsProps) {
  const [budgetView, setBudgetView] = useState<'budget' | 'pending'>('budget');
  const { isBalanceVisible } = useData();
  const remainingBudget = budget - spent;
  
  const toggleBudgetView = () => {
    setBudgetView(prev => prev === 'budget' ? 'pending' : 'budget');
  }

  const hiddenValue = '•••••';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Consolidado
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isBalanceVisible ? formatCurrency(balance) : hiddenValue}</div>
          <p className="text-xs text-muted-foreground">
            {isCurrentMonth ? 'Saldo acumulado até o dia de hoje' : 'Saldo no final do mês selecionado'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Receitas (Mês)
          </CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{isBalanceVisible ? formatCurrency(income) : hiddenValue}</div>
          <p className="text-xs text-muted-foreground">
            Total de receitas no mês selecionado
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Despesas (Mês)
          </CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{isBalanceVisible ? formatCurrency(Math.abs(expenses)) : hiddenValue}</div>
           <p className="text-xs text-muted-foreground">
            Total de despesas no mês selecionado
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {budgetView === 'budget' ? 'Orçamento Restante' : 'Necessário para Quitar'}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleBudgetView}>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardHeader>
        <CardContent>
          {budgetView === 'budget' ? (
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
                Soma das despesas pendentes/atrasadas
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
