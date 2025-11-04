'use client';

import { useState } from 'react';
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader, PlusCircle } from 'lucide-react';
import type { Budget, Category } from '@/lib/definitions';
import { BudgetsTable } from '@/components/budgets/BudgetsTable';
import { BudgetDialog } from '@/components/budgets/BudgetDialog';
import { format } from 'date-fns';

export default function BudgetsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));


  const budgetsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/budgets`), orderBy('month', 'desc')) : null),
    [firestore, user]
  );
  
  const categoriesQuery = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/categories`) : null),
    [firestore, user]
    );

  const { data: budgets, isLoading: loadingBudgets } = useCollection<Budget>(budgetsQuery);
  const { data: categories, isLoading: loadingCategories } = useCollection<Category>(categoriesQuery);


  const handleAddBudget = () => {
    setSelectedBudget(undefined);
    setDialogOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setDialogOpen(true);
  };
  
  const isLoading = loadingBudgets || loadingCategories;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  const enrichedBudgets = (budgets || []).map(budget => {
    const category = (categories || []).find(c => c.id === budget.categoryId);
    return { ...budget, categoryName: category?.name || 'Desconhecida', categoryColor: category?.color || '#A9A9A9' };
  })


  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gerenciar Orçamentos">
        <Button onClick={handleAddBudget}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Orçamento
        </Button>
      </PageHeader>

      <BudgetsTable budgets={enrichedBudgets} onEdit={handleEditBudget} />

      <BudgetDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={selectedBudget}
        categories={categories || []}
      />
    </div>
  );
}
