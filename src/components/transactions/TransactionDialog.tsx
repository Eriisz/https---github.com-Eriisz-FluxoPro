"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { TransactionForm } from './TransactionForm';
import type { Account, Category, Transaction } from '@/lib/definitions';

interface TransactionDialogProps {
    accounts: Account[];
    categories: Category[];
    transaction?: Transaction;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function TransactionDialog({ accounts, categories, transaction, isOpen, onOpenChange, trigger }: TransactionDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = isOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEditing = !!transaction;

  const defaultTrigger = (
    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Adicionar Transação
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Transação' : 'Adicionar Nova Transação'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os detalhes da sua transação.' : 'Preencha os detalhes abaixo para registrar uma nova receita ou despesa.'}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm 
            accounts={accounts} 
            categories={categories} 
            onFormSubmit={() => setOpen(false)}
            transaction={transaction}
        />
      </DialogContent>
    </Dialog>
  );
}
