
import { useState } from "react";
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
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export function RecentTransactions({ transactions }: { transactions: (Transaction & {categoryColor: string})[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleTransactions = transactions.slice(0, 5);
  const hiddenTransactions = transactions.slice(5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes</CardTitle>
        <CardDescription>
          Suas movimentações financeiras do mês atual.
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isOpen ? transactions : visibleTransactions).map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                     {transaction.type === 'income' ? <ArrowUp className="w-4 h-4 text-primary" /> : <ArrowDown className="w-4 h-4 text-destructive" />}
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-muted-foreground md:hidden">
                        {new Date(transaction.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    className="text-white"
                    style={{ backgroundColor: transaction.categoryColor }}
                  >
                    {transaction.category}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                   {new Date(transaction.date).toLocaleDateString("pt-BR", {timeZone: 'UTC'})}
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    transaction.type === "income"
                      ? "text-primary"
                      : ""
                  }`}
                >
                  {transaction.type === 'income' ? formatCurrency(transaction.value) : formatCurrency(transaction.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
         {transactions.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
                Nenhuma transação encontrada para o mês atual.
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
  );
}
