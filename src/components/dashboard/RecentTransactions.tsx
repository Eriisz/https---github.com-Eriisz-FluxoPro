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
import type { Transaction } from "@/lib/definitions";
import { ArrowDown, ArrowUp } from "lucide-react";

export function RecentTransactions({ transactions }: { transactions: (Transaction & {categoryColor: string})[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes</CardTitle>
        <CardDescription>
          Suas últimas 5 movimentações financeiras.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            {transactions.map((transaction) => (
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
      </CardContent>
    </Card>
  );
}
