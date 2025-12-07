
'use client';

import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Account, Transaction } from '@/lib/definitions';
import { formatCurrency } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useData } from '@/context/DataContext';
import { revalidateDashboard } from '@/lib/actions';

interface AccountsTableProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
}

const accountTypeLabels: { [key: string]: string } = {
    'ContaCorrente': 'Conta Corrente',
    'CartaoCredito': 'Cartão de Crédito',
    'Investimento': 'Investimento',
    'Outro': 'Outro'
}

const paidOrReceivedStatuses = ['PAID', 'RECEIVED'];

export function AccountsTable({ accounts, onEdit }: AccountsTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [accountToDelete, setAccountToDelete] = React.useState<Account | null>(null);
  const { allTransactions, isBalanceVisible } = useData();

  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach(account => {
        const transactionsForAccount = (allTransactions || []).filter(
            t => t.accountId === account.id && paidOrReceivedStatuses.includes(t.status)
        );
        const totalFromTransactions = transactionsForAccount.reduce((acc, t) => acc + t.value, 0);
        balances.set(account.id, (account.initialBalance || 0) + totalFromTransactions);
    });
    return balances;
  }, [accounts, allTransactions]);


  const handleDeleteClick = (account: Account) => {
    setAccountToDelete(account);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (user && accountToDelete) {
      const accountRef = doc(firestore, `users/${user.uid}/accounts`, accountToDelete.id);
      deleteDocumentNonBlocking(accountRef);
      await revalidateDashboard();
      toast({
        title: 'Sucesso!',
        description: 'Conta deletada com sucesso.',
      });
      setIsAlertOpen(false);
      setAccountToDelete(null);
    }
  };

  const hiddenValue = '•••••';

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo / Limite</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length > 0 ? (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{accountTypeLabels[account.type] || account.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {account.type === 'CartaoCredito'
                      ? `Limite: ${isBalanceVisible ? formatCurrency(account.limit || 0) : hiddenValue}`
                      : isBalanceVisible ? formatCurrency(accountBalances.get(account.id) || 0) : hiddenValue}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(account)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(account)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Nenhuma conta encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente a conta{' '}
              <strong>{accountToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
