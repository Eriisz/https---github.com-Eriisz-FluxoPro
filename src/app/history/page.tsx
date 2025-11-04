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
import { ArrowDown, ArrowUp } from "lucide-react";

// Dados fictícios - Em uma aplicação real, isso viria do Firestore
const MOCK_CATEGORIES: Category[] = [
    { id: '1', userId: '1', name: 'Receita', color: 'hsl(var(--primary))' },
    { id: '2', userId: '1', name: 'Moradia', color: '#3B82F6' },
    { id: '3', userId: '1', name: 'Alimentação', color: '#F97316' },
    { id: '4', userId: '1', name: 'Transporte', color: '#8B5CF6' },
    { id: '5', userId: '1', name: 'Lazer', color: '#EC4899' },
    { id: '6', userId: '1', name: 'Saúde', color: '#14B8A6' },
    { id: '7', userId: '1', name: 'Outros', color: '#A1A1AA' },
]

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', userId: '1', description: 'Salário', category: 'Receita', value: 5000, date: new Date(2024, 6, 5).toISOString(), account: 'Conta Corrente', type: 'income' },
  { id: '2', userId: '1', description: 'Aluguel', category: 'Moradia', value: -1500, date: new Date(2024, 6, 10).toISOString(), account: 'Conta Corrente', type: 'expense' },
  { id: '3', userId: '1', description: 'Supermercado', category: 'Alimentação', value: -450, date: new Date(2024, 6, 12).toISOString(), account: 'Cartão de Crédito', type: 'expense' },
  { id: '4', userId: '1', description: 'Gasolina', category: 'Transporte', value: -150, date: new Date(2024, 6, 15).toISOString(), account: 'Cartão de Crédito', type: 'expense' },
  { id: '5', userId: '1', description: 'Cinema', category: 'Lazer', value: -80, date: new Date(2024, 6, 18).toISOString(), account: 'Cartão de Crédito', type: 'expense' },
  { id: '6', userId: '1', description: 'Freelance', category: 'Receita', value: 750, date: new Date(2024, 6, 20).toISOString(), account: 'Conta Corrente', type: 'income' },
  { id: '7', userId: '1', description: 'Conta de Luz', category: 'Moradia', value: -120, date: new Date(2024, 6, 22).toISOString(), account: 'Conta Corrente', type: 'expense' },
  { id: '8', userId: '1', description: 'Restaurante', category: 'Alimentação', value: -120, date: new Date(2024, 6, 25).toISOString(), account: 'Cartão de Crédito', type: 'expense' },
];

async function getHistoryData() {
  const transactions = MOCK_TRANSACTIONS
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(t => {
        const category = MOCK_CATEGORIES.find(c => c.name === t.category);
        return {...t, categoryColor: category?.color || '#A9A9A9'}
    });
  return { transactions };
}


export default async function HistoryPage() {
  const { transactions } = await getHistoryData();

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
              {transactions.map((transaction) => (
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
                      {transaction.category}
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
