
'use client';
import { useState, useMemo } from 'react';
import { PageHeader } from "@/components/PageHeader";
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

export default function HistoryPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>(undefined);
  const { allTransactions, categories, accounts, isLoading } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };
  
  const handleAddTransaction = () => {
    setSelectedTransaction(undefined);
    setDialogOpen(true);
  }

  const monthlyTransactions = useMemo(() => {
    if (!allTransactions) return [];
    
    const startOfSelectedMonth = startOfMonth(currentDate);
    const endOfSelectedMonth = endOfMonth(currentDate);

    const sortedTransactions = allTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return sortedTransactions
        .filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startOfSelectedMonth && tDate <= endOfSelectedMonth;
        })
        .map(t => {
            const category = (categories || []).find(c => c.id === t.categoryId);
            const account = (accounts || []).find(a => a.id === t.accountId);
            return { 
                ...t, 
                categoryColor: category?.color || '#A9A9A9', 
                categoryName: category?.name || 'Sem Categoria',
                accountName: account?.name || 'Conta desconhecida'
            };
        });
  }, [allTransactions, categories, accounts, currentDate]);
  
  const incomeTransactions = useMemo(() => monthlyTransactions.filter(t => t.type === 'income'), [monthlyTransactions]);
  const expenseTransactions = useMemo(() => monthlyTransactions.filter(t => t.type === 'expense'), [monthlyTransactions]);

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
      <Card>
        <CardHeader>
          <CardTitle>Movimentações do Mês</CardTitle>
          <CardDescription>
            Visualize suas receitas e despesas do período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="expenses" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="expenses">Despesas</TabsTrigger>
                    <TabsTrigger value="income">Receitas</TabsTrigger>
                </TabsList>
                <TabsContent value="expenses">
                    <HistoryTable
                        transactions={expenseTransactions}
                        onEdit={handleEditTransaction}
                    />
                </TabsContent>
                <TabsContent value="income">
                    <HistoryTable
                        transactions={incomeTransactions}
                        onEdit={handleEditTransaction}
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
