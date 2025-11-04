'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Budget, Category } from '@/lib/definitions';
import { BudgetForm } from './BudgetForm';

interface BudgetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget;
  categories: Category[];
}

export function BudgetDialog({ isOpen, onOpenChange, budget, categories }: BudgetDialogProps) {
  const handleFormSubmit = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{budget ? 'Editar Orçamento' : 'Adicionar Novo Orçamento'}</DialogTitle>
          <DialogDescription>
            {budget ? 'Atualize os detalhes do seu orçamento.' : 'Preencha os detalhes do novo orçamento.'}
          </DialogDescription>
        </DialogHeader>
        <BudgetForm 
            existingBudget={budget} 
            onFormSubmit={handleFormSubmit}
            categories={categories}
        />
      </DialogContent>
    </Dialog>
  );
}
