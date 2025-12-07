
'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { MoreVertical, Pencil, Trash2, CalendarIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import type { Goal } from '@/lib/definitions';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { revalidateDashboard } from '@/lib/actions';
import { useData } from '@/context/DataContext';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
}

export function GoalCard({ goal, onEdit }: GoalCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isBalanceVisible } = useData();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);

  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  const hiddenValue = '•••••';

  const handleDelete = async () => {
    if (!user) return;
    const goalRef = doc(firestore, `users/${user.uid}/goals`, goal.id);
    deleteDocumentNonBlocking(goalRef);
    await revalidateDashboard();
    toast({ title: 'Sucesso!', description: 'Meta deletada com sucesso.' });
    setIsAlertOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>{goal.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsAlertOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            {isBalanceVisible ? formatCurrency(goal.targetAmount) : hiddenValue}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex justify-between text-sm">
              <span className="font-medium text-primary">
                {isBalanceVisible ? formatCurrency(goal.currentAmount) : hiddenValue}
              </span>
              <span className="text-muted-foreground">
                Progresso: {progress.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isBalanceVisible
                ? (remaining > 0
                  ? `${formatCurrency(remaining)} restantes para atingir sua meta.`
                  : 'Meta alcançada! Parabéns!')
                : '••••• restantes para sua meta.'}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-start items-center text-xs text-muted-foreground gap-2">
            <CalendarIcon className="w-4 h-4"/>
            <span>Data Alvo: {format(new Date(goal.targetDate), 'dd/MM/yyyy')}</span>
        </CardFooter>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente a meta{' '}
              <strong>{goal.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
