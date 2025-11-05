'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Goal } from '@/lib/definitions';
import { GoalForm } from './GoalForm';

interface GoalDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
}

export function GoalDialog({ isOpen, onOpenChange, goal }: GoalDialogProps) {
  const handleFormSubmit = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Editar Meta' : 'Adicionar Nova Meta'}</DialogTitle>
          <DialogDescription>
            {goal ? 'Atualize os detalhes da sua meta.' : 'Preencha os detalhes da nova meta de economia.'}
          </DialogDescription>
        </DialogHeader>
        <GoalForm 
            existingGoal={goal} 
            onFormSubmit={handleFormSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
