
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
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
import { MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Transaction } from '@/lib/definitions';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, writeBatch, query, where, collection, getDocs } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Badge } from '../ui/badge';
import { formatCurrency } from '@/lib/utils';
import { isPast, startOfToday } from 'date-fns';
import { revalidateDashboard } from '@/lib/actions';
import { useData } from '@/context/DataContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface HistoryTableProps {
  transactions: (Transaction & { categoryName: string, categoryColor: string, accountName: string })[];
  onEdit: (transaction: Transaction) => void;
  total?: number;
}

export function HistoryTable({ transactions, onEdit, total }: HistoryTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isBalanceVisible } = useData();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);
  const [deleteScope, setDeleteScope] = React.useState<'current' | 'all'>('current');

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteScope('current');
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !transactionToDelete) return;

    if (transactionToDelete.groupId && deleteScope === 'all') {
      const batch = writeBatch(firestore);
      const transactionsCol = collection(firestore, `users/${user.uid}/transactions`);
      const q = query(transactionsCol, where('groupId', '==', transactionToDelete.groupId));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      batch.commit().catch(e => {
        toast({
          variant: 'destructive',
          title: 'Erro ao deletar',
          description: 'Não foi possível deletar as transações do grupo.',
        });
      });
      toast({
        title: 'Sucesso!',
        description: 'As transações do grupo foram marcadas para exclusão.',
      });
    } else {
      const transactionRef = doc(firestore, `users/${user.uid}/transactions`, transactionToDelete.id);
      deleteDocumentNonBlocking(transactionRef);
      toast({
        title: 'Sucesso!',
        description: 'Transação deletada com sucesso.',
      });
    }

    await revalidateDashboard();
    setIsAlertOpen(false);
    setTransactionToDelete(null);
  };

  const getTransactionStatus = (transaction: Transaction) => {
    const transactionDate = new Date(transaction.date);
    if (transaction.status === 'PENDING' && isPast(transactionDate) && transactionDate < startOfToday()) {
        return 'LATE';
    }
    return transaction.status;
  }

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch(status) {
        case 'PAID':
        case 'RECEIVED':
            return 'default';
        case 'LATE':
            return 'destructive';
        case 'PENDING':
        default:
            return 'secondary';
    }
  }
  
  const statusLabels: {[key: string]: string} = {
    PAID: 'Pago',
    PENDING: 'Pendente',
    RECEIVED: 'Recebido',
    LATE: 'Atrasado',
  };


  return (
    <>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Conta</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? transactions.map((transaction) => {
                const status = getTransactionStatus(transaction);
                return (
                    <TableRow key={transaction.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        {transaction.type === 'income' ? <ArrowUp className="w-4 h-4 text-primary" /> : <ArrowDown className="w-4 h-4 text-destructive" />}
                        <div className="flex flex-col">
                            <span className="font-medium">
                              {transaction.description}
                              {transaction.installments && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({transaction.installments.current}/{transaction.installments.total})
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground sm:hidden">
                                {new Date(transaction.date).toLocaleDateString("pt-BR", {timeZone: 'UTC', day: '2-digit', month: '2-digit', year: '2-digit'})} - {transaction.accountName}
                            </span>
                        </div>
                        </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                        <Badge
                        className="text-white"
                        style={{ backgroundColor: transaction.categoryColor }}
                        >
                        {transaction.categoryName}
                        </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{transaction.accountName}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                        {new Date(transaction.date).toLocaleDateString("pt-BR", {timeZone: 'UTC'})}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        <Badge variant={getStatusVariant(status)}>{statusLabels[status]}</Badge>
                    </TableCell>
                    <TableCell
                        className={`text-right font-medium ${
                        transaction.type === "income"
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                    >
                        {isBalanceVisible ? (transaction.type === 'expense' ? `-${formatCurrency(Math.abs(transaction.value))}`: formatCurrency(transaction.value)) : '•••••'}
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
                            <DropdownMenuItem onClick={() => onEdit(transaction)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteClick(transaction)}
                            >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                )
            }) : (
              <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhuma transação encontrada para este período.
                  </TableCell>
              </TableRow>
            )}
            </TableBody>
             {transactions.length > 0 && total !== undefined && (
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={5} className="text-right font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">{isBalanceVisible ? formatCurrency(total) : '•••••'}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableFooter>
            )}
          </Table>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente a transação{' '}
              <strong>{transactionToDelete?.description}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {transactionToDelete?.groupId && (
            <div className="space-y-3 bg-muted p-3 rounded-md border my-4">
              <Label className="text-sm font-semibold">Esta é uma transação recorrente/parcelada.</Label>
              <RadioGroup value={deleteScope} onValueChange={(value) => setDeleteScope(value as 'current' | 'all')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="current" id="delete-current-history" />
                  <Label htmlFor="delete-current-history" className="font-normal">Deletar somente esta ocorrência</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="delete-all-history" />
                  <Label htmlFor="delete-all-history" className="font-normal">Deletar todas as ocorrências</Label>
                </div>
              </RadioGroup>
            </div>
          )}

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

    
