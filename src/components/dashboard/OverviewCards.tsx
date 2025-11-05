import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Ban, AlertCircle } from "lucide-react";
import { Progress } from "../ui/progress";

type OverviewCardsProps = {
    balance: number;
    income: number;
    expenses: number;
    budget: number;
    spent: number;
    pendingIncome: number;
    pendingExpenses: number;
}

export function OverviewCards({ balance, income, expenses, budget, spent, pendingIncome, pendingExpenses }: OverviewCardsProps) {
  const remainingBudget = budget - spent;
  const totalPending = pendingIncome + pendingExpenses;
  const incomePercent = totalPending > 0 ? (pendingIncome / totalPending) * 100 : 0;
  const expensePercent = totalPending > 0 ? (pendingExpenses / totalPending) * 100 : 0;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Atual
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
          <p className="text-xs text-muted-foreground">
            Balanço total de todas as contas
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Receitas (Mês)
          </CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(income)}</div>
          <p className="text-xs text-muted-foreground">
            Total de receitas no mês atual
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Despesas (Mês)
          </CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{formatCurrency(expenses)}</div>
           <p className="text-xs text-muted-foreground">
            Total de despesas no mês atual
          </p>
        </CardContent>
      </Card>
      <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes (Mês)</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="relative h-2 w-full rounded-full bg-destructive/50 my-2">
                    <div
                        className="absolute h-full rounded-full bg-primary"
                        style={{ width: `${incomePercent}%` }}
                    />
                </div>
                 <div className="text-xs text-muted-foreground mt-3 space-y-1">
                    <div className="flex justify-between">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            <span>Receitas</span>
                        </span>
                        <span>{formatCurrency(pendingIncome)} ({incomePercent.toFixed(0)}%)</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="flex items-center gap-1.5">
                             <span className="h-2 w-2 rounded-full bg-destructive" />
                            <span>Despesas</span>
                        </span>
                         <span>{formatCurrency(pendingExpenses)} ({expensePercent.toFixed(0)}%)</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Restante</CardTitle>
          <Ban className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-foreground' : 'text-destructive'}`}>
            {formatCurrency(remainingBudget)}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(spent)} de {formatCurrency(budget)} gastos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
