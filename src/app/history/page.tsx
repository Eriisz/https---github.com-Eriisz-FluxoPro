'use client';
import { useState } from 'react';
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Transaction, Category, Account } from "@/lib/definitions";
import { Loader } from "lucide-react";
import { useCollection, useUser, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { HistoryTable } from '@/components/history/HistoryTable';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>(undefined);

  const transactionsQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, `users/${user.uid}/transactions`), orderBy('date', 'desc')) : null, 
    [firestore, user]
  );
  
  const categoriesQuery = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/categories`) : null, 
    [firestore, user]
  );

  const accountsQuery = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/accounts`) : null,
    [firestore, user]
  );

  const { data: transactions, isLoading: loadingTransactions } = useCollection<Transaction>(transactionsQuery);
  const { data: categories, isLoading: loadingCategories } = useCollection<Category>(categoriesQuery);
  const { data: accounts, isLoading: loadingAccounts } = useCollection<Account>(accountsQuery);

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };
  
  const handleAddTransaction = () => {
    setSelectedTransaction(undefined);
    setDialogOpen(true);
  }

  const getHistoryData = () => {
    const enrichedTransactions = (transactions || []).map(t => {
      const category = (categories || []).find(c => c.id === t.categoryId);
      const account = (accounts || []).find(a => a.id === t.accountId);
      return { 
        ...t, 
        categoryColor: category?.color || '#A9A9A9', 
        categoryName: category?.name || t.category,
        accountName: account?.name || t.account
      };
    });
    return { transactions: enrichedTransactions };
  }

  const { transactions: historyTransactions } = getHistoryData();
  const isLoading = loadingTransactions || loadingCategories || loadingAccounts;

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
