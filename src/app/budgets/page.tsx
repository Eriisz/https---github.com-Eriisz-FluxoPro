'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader, PlusCircle } from 'lucide-react';
import type { Budget } from '@/lib/definitions';
import { BudgetsTable } from '@/components/budgets/BudgetsTable';
import { BudgetDialog } from '@/components/budgets/BudgetDialog';
import { useData } from '@/context/DataContext';

export default function BudgetsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>(undefined);
  const { budgets, isLoading } = useData();

  const handleAddBudget = () => {
    setSelectedBudget(undefined);
    setDialogOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setDialogOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const sortedBudgets = (budgets || []).sort((a,b) => b.month.localeCompare(a.month));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gerenciar Orçamentos">
        <Button onClick={handleAddBudget}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Orçamento
        </Button>
      </PageHeader>

      <BudgetsTable budgets={sortedBudgets || []} onEdit={handleEditBudget} />

      <BudgetDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={selectedBudget}
      />
    </div>
  );
}
