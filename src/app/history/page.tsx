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
import type { Transaction } from "@/lib/definitions";
import { Loader } from "lucide-react";
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { HistoryTable } from '@/components/history/HistoryTable';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useData } from '@/context/DataContext';

export default function HistoryPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>(undefined);
  const { allTransactions, categories, accounts, isLoading } = useData();

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };
  
  const handleAddTransaction = () => {
    setSelectedTransaction(undefined);
    setDialogOpen(true);
  }

  const historyTransactions = useMemo(() => {
    const sortedTransactions = (allTransactions || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return sortedTransactions.map(t => {
      const category = (categories || []).find(c => c.id === t.categoryId);
      const account = (accounts || []).find(a => a.id === t.accountId);
      return { 
        ...t, 
        categoryColor: category?.color || '#A9A9A9', 
        categoryName: category?.name || 'Sem Categoria',
        accountName: account?.name || 'Conta desconhecida'
      };
    });
  }, [allTransactions, categories, accounts]);
  
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
          <CardTitle>Todas as Movimentações</CardTitle>
          <CardDescription>
            Aqui está o histórico completo de suas transações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryTable
            transactions={historyTransactions}
            onEdit={handleEditTransaction}
          />
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
