'use client';

import { useState } from 'react';
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader, PlusCircle } from 'lucide-react';
import type { Budget } from '@/lib/definitions';
import { BudgetsTable } from '@/components/budgets/BudgetsTable';
import { BudgetDialog } from '@/components/budgets/BudgetDialog';
import { format } from 'date-fns';

export default function BudgetsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>(undefined);


  const budgetsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/budgets`), orderBy('month', 'desc')) : null),
    [firestore, user]
  );

  const { data: budgets, isLoading: loadingBudgets } = useCollection<Budget>(budgetsQuery);

  const handleAddBudget = () => {
    setSelectedBudget(undefined);
    setDialogOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setDialogOpen(true);
  };
  
  const isLoading = loadingBudgets;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gerenciar Orçamentos">
        <Button onClick={handleAddBudget}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Orçamento
        </Button>
      </PageHeader>

      <BudgetsTable budgets={budgets || []} onEdit={handleEditBudget} />

      <BudgetDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={selectedBudget}
      />
    </div>
  );
}
