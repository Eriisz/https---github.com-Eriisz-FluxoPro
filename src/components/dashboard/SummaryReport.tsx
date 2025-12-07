
'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Category, Transaction } from '@/lib/definitions';
import { formatCurrency } from '@/lib/utils';
import { ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react';
import { useData } from '@/context/DataContext';

interface SummaryReportProps {
  monthlyData: Transaction[];
  yearlyData: Transaction[];
  categories: Category[];
}

const paidOrReceivedStatuses = ['PAID', 'RECEIVED'];

function calculateSummary(transactions: Transaction[]) {
  const income = transactions
    .filter(t => t.type === 'income' && paidOrReceivedStatuses.includes(t.status))
    .reduce((acc, t) => acc + t.value, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
    .reduce((acc, t) => acc + t.value, 0);

  const net = income + expenses;

  return { income, expenses: Math.abs(expenses), net };
}

function getTopSpendingCategories(transactions: Transaction[], categories: Category[]) {
    const spendingMap = new Map<string, number>();

    transactions
        .filter(t => t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
        .forEach(t => {
            const currentTotal = spendingMap.get(t.categoryId) || 0;
            spendingMap.set(t.categoryId, currentTotal + Math.abs(t.value));
        });

    return Array.from(spendingMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([categoryId, total]) => {
            const category = categories.find(c => c.id === categoryId);
            return {
                name: category?.name || 'Desconhecido',
                total,
                color: category?.color || '#A9A9A9',
            };
        });
}

const SummaryTab = ({ title, data, categories }: { title: string, data: Transaction[], categories: Category[] }) => {
  const { isBalanceVisible } = useData();
  const { income, expenses, net } = calculateSummary(data);
  const topSpending = getTopSpendingCategories(data, categories);
  const hiddenValue = '•••••';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <Card className="bg-muted/30">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{isBalanceVisible ? formatCurrency(income) : hiddenValue}</div>
          </CardContent>
        </Card>
         <Card className="bg-muted/30">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{isBalanceVisible ? formatCurrency(expenses) : hiddenValue}</div>
          </CardContent>
        </Card>
         <Card className="bg-muted/30">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {isBalanceVisible ? formatCurrency(net) : hiddenValue}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
         <Card className="h-full">
            <CardHeader>
                <CardTitle>Principais Despesas</CardTitle>
                <CardDescription>Suas 5 maiores categorias de gastos no período.</CardDescription>
            </CardHeader>
            <CardContent>
                {topSpending.length > 0 ? (
                    <ul className="space-y-4">
                        {topSpending.map(item => (
                            <li key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}/>
                                    <span className="font-medium">{item.name}</span>
                                </div>
                                <span className="font-semibold">{isBalanceVisible ? formatCurrency(item.total) : hiddenValue}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhuma despesa registrada no período.
                    </p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
};


export function SummaryReport({ monthlyData, yearlyData, categories }: SummaryReportProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório Financeiro</CardTitle>
        <CardDescription>
          Analise suas receitas e despesas por período.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="month" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="month">Mês Atual</TabsTrigger>
            <TabsTrigger value="year">Este Ano</TabsTrigger>
          </TabsList>
          <TabsContent value="month">
            <SummaryTab title="Resumo do Mês" data={monthlyData} categories={categories} />
          </TabsContent>
          <TabsContent value="year">
            <SummaryTab title="Resumo do Ano" data={yearlyData} categories={categories} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
