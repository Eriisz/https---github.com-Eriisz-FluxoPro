'use client';

import React from 'react';
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
import { MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Transaction } from '@/lib/definitions';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Badge } from '../ui/badge';
import { formatCurrency } from '@/lib/utils';
import { isPast, startOfToday } from 'date-fns';

interface HistoryTableProps {
  transactions: (Transaction & { categoryName: string, categoryColor: string, accountName: string })[];
  onEdit: (transaction: Transaction) => void;
}

export function HistoryTable({ transactions, onEdit }: HistoryTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (user && transactionToDelete) {
      const transactionRef = doc(firestore, `users/${user.uid}/transactions`, transactionToDelete.id);
      deleteDocumentNonBlocking(transactionRef);
      toast({
        title: 'Sucesso!',
        description: 'Transação deletada com sucesso.',
      });
      setIsAlertOpen(false);
      setTransactionToDelete(null);
    }
  };

  const getTransactionStatus = (transaction: Transaction) => {
    if (transaction.status === 'PENDING' && isPast(new Date(transaction.date)) && new Date(transaction.date) < startOfToday()) {
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
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const status = getTransactionStatus(transaction);
                return (
                    <TableRow key={transaction.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        {transaction.type === 'income' ? <ArrowUp className="w-4 h-4 text-primary" /> : <ArrowDown className="w-4 h-4 text-destructive" />}
                        <span className="font-medium">{transaction.description}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge
                        className="text-white"
                        style={{ backgroundColor: transaction.categoryColor }}
                        >
                        {transaction.categoryName}
                        </Badge>
                    </TableCell>
                    <TableCell>{transaction.accountName}</TableCell>
                    <TableCell>
                        {new Date(transaction.date).toLocaleDateString("pt-BR", {timeZone: 'UTC'})}
                    </TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(status)}>{statusLabels[status]}</Badge>
                    </TableCell>
                    <TableCell
                        className={`text-right font-medium ${
                        transaction.type === "income"
                            ? "text-primary"
                            : "text-destructive"
                        }`}
                    >
                        {formatCurrency(transaction.value)}
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
            })}
            </TableBody>
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
