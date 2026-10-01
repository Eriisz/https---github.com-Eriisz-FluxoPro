
'use client';

import { useState } from 'react';
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
import { ArrowDownCircle, ArrowUpCircle, FileDown, Scale } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SummaryReportProps {
  monthlyData: Transaction[];
  yearlyData: Transaction[];
  categories: Category[];
  periodDate: Date;
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
      <h2 className="sr-only">{title}</h2>
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


export function SummaryReport({ monthlyData, yearlyData, categories, periodDate }: SummaryReportProps) {
  const [activePeriod, setActivePeriod] = useState<'month' | 'year'>('month');
  const periodLabel = activePeriod === 'month'
    ? format(periodDate, 'MMMM yyyy', { locale: ptBR })
    : format(periodDate, 'yyyy');

  const handleExportPdf = () => {
    const previousTitle = document.title;
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.classList.remove('print-executive-report');
      document.title = previousTitle;
      window.removeEventListener('afterprint', cleanup);
    };

    document.title = `FluxoPro - Relatório Executivo - ${periodLabel}`;
    document.body.classList.add('print-executive-report');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  };

  return (
    <Card id="executive-report">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Relatório Financeiro</CardTitle>
          <CardDescription>
            Resumo executivo de {periodLabel}. Na janela de impressão, escolha “Salvar como PDF”.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" className="no-print shrink-0" onClick={handleExportPdf}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activePeriod}
          onValueChange={(value) => setActivePeriod(value as 'month' | 'year')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="month">Mês selecionado</TabsTrigger>
            <TabsTrigger value="year">Ano selecionado</TabsTrigger>
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
