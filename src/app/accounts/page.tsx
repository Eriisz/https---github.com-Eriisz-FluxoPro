'use client';

import { useState } from 'react';
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader, PlusCircle } from 'lucide-react';
import type { Account } from '@/lib/definitions';
import { AccountsTable } from '@/components/accounts/AccountsTable';
import { AccountDialog } from '@/components/accounts/AccountDialog';

export default function AccountsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);

  const accountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/accounts`) : null),
    [firestore, user]
  );

  const { data: accounts, isLoading } = useCollection<Account>(accountsQuery);

  const handleAddAccount = () => {
    setSelectedAccount(undefined);
    setDialogOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Gerenciar Contas">
        <Button onClick={handleAddAccount}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Conta
        </Button>
      </PageHeader>

      <AccountsTable accounts={accounts || []} onEdit={handleEditAccount} />

      <AccountDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
      />
    </div>
  );
}
