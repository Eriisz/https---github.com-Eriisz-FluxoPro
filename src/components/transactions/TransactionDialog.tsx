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
import type { Account, Category } from '@/lib/definitions';

interface TransactionDialogProps {
    accounts: Account[];
    categories: Category[];
}

export function TransactionDialog({ accounts, categories }: TransactionDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Transação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Transação</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo para registrar uma nova receita ou despesa.
          </DialogDescription>
        </DialogHeader>
        <TransactionForm accounts={accounts} categories={categories} onFormSubmit={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
