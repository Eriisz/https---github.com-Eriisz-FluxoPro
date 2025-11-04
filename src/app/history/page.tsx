'use client';
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Transaction, Category } from "@/lib/definitions";
import { ArrowDown, ArrowUp, Loader } from "lucide-react";
import { useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, `users/${user.uid}/transactions`), orderBy('date', 'desc')) : null, 
    [firestore, user]
  );
  
  const categoriesQuery = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/categories`) : null, 
    [firestore, user]
  );

  const { data: transactions, isLoading: loadingTransactions } = useCollection<Transaction>(transactionsQuery);
  const { data: categories, isLoading: loadingCategories } = useCollection<Category>(categoriesQuery);

  const getHistoryData = () => {
    const enrichedTransactions = (transactions || []).map(t => {
      const category = (categories || []).find(c => c.id === t.categoryId);
      return { ...t, categoryColor: category?.color || '#A9A9A9', categoryName: category?.name || t.category };
    });
    return { transactions: enrichedTransactions };
  }

  const { transactions: historyTransactions } = getHistoryData();
  const isLoading = loadingTransactions || loadingCategories;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Histórico de Transações" />
      <Card>
        <CardHeader>
          <CardTitle>Todas as Movimentações</CardTitle>
          <CardDescription>
            Aqui está o histórico completo de suas transações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyTransactions.map((transaction) => (
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
                  <TableCell>{transaction.account}</TableCell>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString("pt-BR", {timeZone: 'UTC'})}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
