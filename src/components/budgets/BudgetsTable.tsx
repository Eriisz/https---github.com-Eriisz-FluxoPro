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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Budget } from '@/lib/definitions';
import { formatCurrency } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface BudgetsTableProps {
  budgets: Budget[];
  onEdit: (budget: Budget) => void;
}

export function BudgetsTable({ budgets, onEdit }: BudgetsTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [budgetToDelete, setBudgetToDelete] = React.useState<Budget | null>(null);

  const handleDeleteClick = (budget: Budget) => {
    setBudgetToDelete(budget);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (user && budgetToDelete) {
      const budgetRef = doc(firestore, `users/${user.uid}/budgets`, budgetToDelete.id);
      deleteDocumentNonBlocking(budgetRef);
      toast({
        title: 'Sucesso!',
        description: 'Orçamento deletado com sucesso.',
      });
      setIsAlertOpen(false);
      setBudgetToDelete(null);
    }
  };
  
  const formatMonth = (monthString: string) => {
    try {
        const date = parse(monthString, 'yyyy-MM', new Date());
        return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    } catch(e) {
        return monthString;
    }
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Limite</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.length > 0 ? (
              budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell className="font-medium capitalize">{formatMonth(budget.month)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(budget.limit)}
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
                        <DropdownMenuItem onClick={() => onEdit(budget)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(budget)}
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
                <TableCell colSpan={3} className="h-24 text-center">
                  Nenhum orçamento encontrado.
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
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente o orçamento para {' '}
              <strong>{budgetToDelete ? formatMonth(budgetToDelete.month) : ''}</strong>.
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
