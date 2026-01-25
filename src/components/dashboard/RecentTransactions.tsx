
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "../ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/lib/definitions";
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { useUser, useFirestore } from "@/firebase";
import { doc, writeBatch, query, where, collection, getDocs } from "firebase/firestore";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { TransactionDialog } from "../transactions/TransactionDialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../ui/alert-dialog";
import React from "react";
import { useData } from "@/context/DataContext";
import { revalidateDashboard } from "@/lib/actions";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions: rawTransactions }: RecentTransactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>(undefined);
  const [deleteScope, setDeleteScope] = React.useState<'current' | 'all'>('current');
  
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { accounts, categories, isBalanceVisible } = useData();

  const transactions = useMemo(() => {
    return (rawTransactions || []).map(t => {
      const category = (categories || []).find(c => c.id === t.categoryId);
      const categoryName = category ? category.name : 'Sem Categoria';
      const categoryColor = category ? category.color : '#A9A9A9';
      return {...t, categoryName, categoryColor }
    });
  }, [rawTransactions, categories]);

  const visibleTransactions = transactions.slice(0, 5);
  const hiddenTransactions = transactions.slice(5);

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
  
  const handleEditClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditDialogOpen(true);
  }

  const handleDialogChange = (isOpen: boolean) => {
    setIsEditDialogOpen(isOpen);
    if (!isOpen) {
        setSelectedTransaction(undefined);
    }
  }


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
          <CardDescription>
            Suas movimentações financeiras do mês selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isOpen ? transactions : visibleTransactions).map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                       {transaction.type === 'income' ? <ArrowUp className="w-4 h-4 text-primary" /> : <ArrowDown className="w-4 h-4 text-destructive" />}
                      <div>
                        <div className="font-medium">
                          {transaction.description}
                          {transaction.installments && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({transaction.installments.current}/{transaction.installments.total})
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground md:hidden">
                          {new Date(transaction.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      className="text-white"
                      style={{ backgroundColor: (transaction as any).categoryColor }}
                    >
                      {(transaction as any).categoryName}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                     {new Date(transaction.date).toLocaleDateString("pt-BR", {timeZone: 'UTC'})}
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
                          <DropdownMenuItem onClick={() => handleEditClick(transaction)}>
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
              ))}
            </TableBody>
          </Table>
           {transactions.length === 0 && (
              <div className="text-center p-8 text-muted-foreground">
                  Nenhuma transação encontrada para o mês selecionado.
              </div>
          )}
        </CardContent>
        {hiddenTransactions.length > 0 && (
          <CardFooter className="justify-center py-4">
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
                  <ChevronsUpDown className="mr-2 h-4 w-4" />
                  {isOpen ? 'Ver menos' : `Ver ${hiddenTransactions.length} mais`}
              </Button>
          </CardFooter>
        )}
      </Card>
      {selectedTransaction && (
        <TransactionDialog 
            accounts={accounts || []} 
            categories={categories || []}
            isOpen={isEditDialogOpen}
            onOpenChange={handleDialogChange}
            transaction={selectedTransaction}
        />
      )}
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
                  <RadioGroupItem value="current" id="delete-current" />
                  <Label htmlFor="delete-current" className="font-normal">Deletar somente esta ocorrência</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="delete-all" />
                  <Label htmlFor="delete-all" className="font-normal">Deletar todas as ocorrências</Label>
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

    

