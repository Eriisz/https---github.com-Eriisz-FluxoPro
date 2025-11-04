'use client';
import { PageHeader } from "@/components/PageHeader";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { CategoryChart, MonthlyFlowChart } from "@/components/dashboard/Charts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import type { Transaction, Category, Account, Budget } from "@/lib/definitions";
import { useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const accountsQuery = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/accounts`) : null, [firestore, user]);
  const categoriesQuery = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/categories`) : null, [firestore, user]);

  const now = new Date();
  const currentMonthStr = format(now, 'yyyy-MM');
  const oneMonthAgo = startOfMonth(now);
  
  const currentMonthTransactionsQuery = useMemoFirebase(() =>
    user ? query(
      collection(firestore, `users/${user.uid}/transactions`),
      where('date', '>=', oneMonthAgo.toISOString()),
      where('date', '<=', endOfMonth(now).toISOString())
    ) : null, [firestore, user]
  );
  
  const allTransactionsQuery = useMemoFirebase(() =>
      user ? query(
          collection(firestore, `users/${user.uid}/transactions`),
          orderBy('date', 'desc')
      ) : null, [firestore, user]
  );

  const recentTransactionsQuery = useMemoFirebase(() =>
    user ? query(
      collection(firestore, `users/${user.uid}/transactions`),
      orderBy('date', 'desc'),
      limit(5)
    ) : null, [firestore, user]
  );
  
  const budgetsQuery = useMemoFirebase(() =>
    user ? query(
      collection(firestore, `users/${user.uid}/budgets`),
      where('month', '==', currentMonthStr)
    ) : null,
  [firestore, user, currentMonthStr]);

  const { data: accounts, isLoading: loadingAccounts } = useCollection<Account>(accountsQuery);
  const { data: categories, isLoading: loadingCategories } = useCollection<Category>(categoriesQuery);
  const { data: currentMonthTransactions, isLoading: loadingCurrentMonthTransactions } = useCollection<Transaction>(currentMonthTransactionsQuery);
  const { data: allTransactions, isLoading: loadingAllTransactions } = useCollection<Transaction>(allTransactionsQuery);
  const { data: recentTransactionsData, isLoading: loadingRecent } = useCollection<Transaction>(recentTransactionsQuery);
  const { data: budgets, isLoading: loadingBudgets } = useCollection<Budget>(budgetsQuery);


  const getDashboardData = () => {
    const transactions = currentMonthTransactions || [];
    
    const balance = (allTransactions || []).reduce((acc, t) => acc + t.value, 0);
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.value, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.value, 0);

    const totalBudget = (budgets || []).reduce((acc, b) => acc + b.limit, 0);
    
    const categorySpending = (categories || [])
      .filter(c => c.type === 'expense')
      .map(category => {
          const total = transactions
              .filter(t => t.category === category.name && t.type === 'expense')
              .reduce((acc, t) => acc + Math.abs(t.value), 0);
          return { category: category.name, total, fill: category.color };
      })
      .filter(c => c.total > 0);

    const recentTransactions = (recentTransactionsData || [])
      .map(t => {
          const category = (categories || []).find(c => c.name === t.category);
          return {...t, categoryColor: category?.color || '#A9A9A9'}
      });
      
    const monthlyFlow = Array.from({ length: 12 }, (_, i) => {
        const monthDate = subMonths(new Date(), i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        const monthTransactions = (allTransactions || []).filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });
        
        return {
            month: start.toLocaleString('pt-BR', { month: 'short' }),
            income: monthTransactions.filter(t=> t.type === 'income').reduce((acc, t) => acc + t.value, 0),
            expenses: monthTransactions.filter(t=> t.type === 'expense').reduce((acc, t) => acc + t.value, 0)
        }
    }).reverse();
      
    return {
      accounts: accounts || [],
      categories: categories || [],
      balance,
      income,
      expenses,
      totalBudget: totalBudget,
      spentThisMonth: Math.abs(expenses),
      categorySpending,
      monthlyFlow: monthlyFlow.map(d => ({ ...d, expenses: Math.abs(d.expenses) })),
      recentTransactions,
    };
  }

  const data = getDashboardData();
  const isLoading = loadingAccounts || loadingCategories || loadingCurrentMonthTransactions || loadingRecent || loadingAllTransactions || loadingBudgets;
  
  if (isLoading) {
      return <div>Carregando dados...</div>
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Painel de Controle">
        <TransactionDialog accounts={data.accounts} categories={data.categories} />
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
