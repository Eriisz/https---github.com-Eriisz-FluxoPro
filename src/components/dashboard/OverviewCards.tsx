import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, Ban, AlertCircle } from "lucide-react";

type OverviewCardsProps = {
    balance: number;
    income: number;
    expenses: number;
    budget: number;
    spent: number;
    pendingBills: number;
}

export function OverviewCards({ balance, income, expenses, budget, spent, pendingBills }: OverviewCardsProps) {
  const remainingBudget = budget - spent;
  
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
            Receitas confirmadas no mês atual
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
            Despesas pagas no mês atual
          </p>
        </CardContent>
      </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contas Pendentes (Mês)</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingBills)}</div>
            <p className="text-xs text-muted-foreground">
                Total de contas a pagar no mês
            </p>
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

    