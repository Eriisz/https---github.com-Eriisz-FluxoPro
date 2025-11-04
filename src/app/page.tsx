import { PageHeader } from "@/components/PageHeader";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { CategoryChart, MonthlyFlowChart } from "@/components/dashboard/Charts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import type { Transaction, Category, Account } from "@/lib/definitions";

// Dados fictícios - Em uma aplicação real, isso viria do Firestore
const MOCK_ACCOUNTS: Account[] = [
  { id: '1', userId: '1', name: 'Conta Corrente', type: 'ContaCorrente', balance: 7820 },
  { id: '2', userId: '1', name: 'Cartão de Crédito', type: 'CartaoCredito', balance: 0, limit: 10000 },
];

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
];

const MOCK_MONTHLY_FLOW = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
        month: d.toLocaleString('pt-BR', { month: 'short' }),
        income: Math.random() * 5000 + 2000,
        expenses: Math.random() * -4000 - 1000,
    }
}).reverse();

async function getDashboardData() {
  // Em uma aplicação real, você buscaria os dados do Firestore usando o userId.
  // Por enquanto, usamos dados fictícios.
  const transactions = MOCK_TRANSACTIONS;
  const categories = MOCK_CATEGORIES;
  const accounts = MOCK_ACCOUNTS;
  
  const balance = transactions.reduce((acc, t) => acc + t.value, 0);
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.value, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.value, 0);
  
  const categorySpending = categories
    .filter(c => c.name !== 'Receita')
    .map(category => {
        const total = transactions
            .filter(t => t.category === category.name && t.type === 'expense')
            .reduce((acc, t) => acc + Math.abs(t.value), 0);
        return { category: category.name, total, fill: category.color };
    })
    .filter(c => c.total > 0);

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(t => {
        const category = categories.find(c => c.name === t.category);
        return {...t, categoryColor: category?.color || '#A9A9A9'}
    });
    
  return {
    accounts,
    categories,
    balance,
    income,
    expenses,
    totalBudget: 2500, // fictício
    spentThisMonth: Math.abs(expenses), // fictício
    categorySpending,
    monthlyFlow: MOCK_MONTHLY_FLOW.map(d => ({ ...d, expenses: Math.abs(d.expenses) })),
    recentTransactions,
  };
}


export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Painel de Controle">
        <TransactionDialog accounts={data.accounts} categories={data.categories.filter(c => c.name !== 'Receita')} />
      </PageHeader>

      <OverviewCards 
        balance={data.balance}
        income={data.income}
        expenses={data.expenses}
        budget={data.totalBudget}
        spent={data.spentThisMonth}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MonthlyFlowChart data={data.monthlyFlow} />
        </div>
        <div className="lg:col-span-2">
          <CategoryChart data={data.categorySpending} />
        </div>
      </div>

      <RecentTransactions transactions={data.recentTransactions} />
    </div>
  );
}
