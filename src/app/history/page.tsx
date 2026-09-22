
'use client';
import { useMemo, useState } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { AdvancedFilters } from '@/components/search/AdvancedFilters';
import { EMPTY_FILTERS, filterTransactions, type SearchFilters } from '@/lib/finance-engine';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Transaction } from "@/lib/definitions";
import { Loader } from "lucide-react";
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { HistoryTable } from '@/components/history/HistoryTable';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { MonthYearPicker } from '@/components/shared/MonthYearPicker';
import { startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function HistoryPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>(undefined);
  const { allTransactions, categories, accounts, isLoading } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };
  
  const handleAddTransaction = () => {
    setSelectedTransaction(undefined);
    setDialogOpen(true);
  }

  const monthlyTransactions = useMemo(() => {
    const startOfSelectedMonth = startOfMonth(currentDate);
    const endOfSelectedMonth = endOfMonth(currentDate);
    const scoped = (allTransactions || []).filter((transaction) => {
      if (filters.allPeriods || filters.dateFrom || filters.dateTo) return true;
      const date = new Date(transaction.date);
      return date >= startOfSelectedMonth && date <= endOfSelectedMonth;
    });

    return filterTransactions(scoped, categories || [], accounts || [], filters);
  }, [allTransactions, categories, accounts, currentDate, filters]);
  
  const incomeTransactions = useMemo(() => monthlyTransactions.filter(t => t.type === 'income'), [monthlyTransactions]);
  const expenseTransactions = useMemo(() => monthlyTransactions.filter(t => t.type === 'expense'), [monthlyTransactions]);
  
  const totalIncome = useMemo(() => incomeTransactions.reduce((acc, t) => acc + t.value, 0), [incomeTransactions]);
  const totalExpenses = useMemo(() => expenseTransactions.reduce((acc, t) => acc + t.value, 0), [expenseTransactions]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    )
  }
  
  const handleDialogChange = (isOpen: boolean) => {
    setDialogOpen(isOpen);
    if (!isOpen) {
        setSelectedTransaction(undefined);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Histórico de Transações">
         <MonthYearPicker date={currentDate} onDateChange={setCurrentDate} />
         <TransactionDialog 
            accounts={accounts || []} 
            categories={categories || []}
            isOpen={dialogOpen && !selectedTransaction}
            onOpenChange={handleDialogChange}
            trigger={
                <Button
                    onClick={handleAddTransaction}
                    className="w-full sm:w-auto"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Transação
                </Button>
            }
         />
      </PageHeader>
      <AdvancedFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({ ...EMPTY_FILTERS })}
        categories={categories || []}
        accounts={accounts || []}
      />
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle>Movimentações do Mês</CardTitle>
          <CardDescription>
            Busque e filtre receitas e despesas. Ative “todos os períodos” para pesquisar o histórico completo.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="expenses" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="expenses">Despesas</TabsTrigger>
                    <TabsTrigger value="income">Receitas</TabsTrigger>
                </TabsList>
                <TabsContent value="expenses" className="mt-4">
                    <HistoryTable
                        transactions={expenseTransactions}
                        onEdit={handleEditTransaction}
                        total={totalExpenses}
                    />
                </TabsContent>
                <TabsContent value="income" className="mt-4">
                    <HistoryTable
                        transactions={incomeTransactions}
                        onEdit={handleEditTransaction}
                        total={totalIncome}
                    />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      {/* This dialog is controlled by the state above for editing */}
      {selectedTransaction && (
        <TransactionDialog 
            accounts={accounts || []} 
            categories={categories || []}
            isOpen={dialogOpen && !!selectedTransaction}
            onOpenChange={handleDialogChange}
            transaction={selectedTransaction}
        />
      )}
    </div>
  );
}
