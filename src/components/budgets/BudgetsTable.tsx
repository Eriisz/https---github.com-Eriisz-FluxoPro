
'use client';

import React from 'react';
import { useData } from '@/context/DataContext';
import { budgetProgress } from '@/lib/budgets';
import { Progress } from '@/components/ui/progress';
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
import { doc, deleteDoc } from 'firebase/firestore';
import { confirmWrite } from '@/lib/write-feedback';
import { revalidateDashboard } from '@/lib/actions';

interface BudgetsTableProps {
  budgets: Budget[];
  onEdit: (budget: Budget) => void;
}

export function BudgetsTable({ budgets, onEdit }: BudgetsTableProps) {
  const { user } = useUser();
  const { categories, allTransactions, isBalanceVisible } = useData();
  const money = (value: number) => isBalanceVisible ? formatCurrency(value) : "•••••";
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
      if (!await confirmWrite(deleteDoc(budgetRef), toast)) return;
      await revalidateDashboard().catch(() => undefined);
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
              <TableHead>Categoria</TableHead><TableHead className="text-right">Limite</TableHead><TableHead>Uso do orçamento</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.length > 0 ? (
              budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell className="font-medium capitalize">{formatMonth(budget.month)}</TableCell>
                  <TableCell>{budget.categoryId ? categories?.find(category => category.id === budget.categoryId)?.name || "Categoria removida" : "Total do mês"}</TableCell>
                  <TableCell className="text-right">
                    {money(budget.limit)}
                  </TableCell>
                  <TableCell>{(() => { const progress = budgetProgress(budget, allTransactions || []); return <div className="min-w-[140px] space-y-1"><p className="text-xs">Gasto: {money(progress.spent)}</p><Progress value={isBalanceVisible ? Math.min(100, progress.percent) : 0} aria-label="Uso do orçamento" /><p className="text-xs">{isBalanceVisible ? `${Math.round(progress.percent)}% · ${progress.remaining < 0 ? 'Excedido' : 'Restante'}: ${money(Math.abs(progress.remaining))}` : '•••••'}</p></div>; })()}</TableCell>
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
                <TableCell colSpan={5} className="h-24 text-center">
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
