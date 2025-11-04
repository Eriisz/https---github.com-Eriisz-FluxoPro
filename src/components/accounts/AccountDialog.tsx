'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Account } from '@/lib/definitions';
import { AccountForm } from './AccountForm';

interface AccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
}

export function AccountDialog({ isOpen, onOpenChange, account }: AccountDialogProps) {
  const handleFormSubmit = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar Conta' : 'Adicionar Nova Conta'}</DialogTitle>
          <DialogDescription>
            {account ? 'Atualize os detalhes da sua conta.' : 'Preencha os detalhes da nova conta.'}
          </DialogDescription>
        </DialogHeader>
        <AccountForm existingAccount={account} onFormSubmit={handleFormSubmit} />
      </DialogContent>
    </Dialog>
  );
}
