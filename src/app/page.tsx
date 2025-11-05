'use client';
import { useMemo } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { CategoryChart, MonthlyFlowChart, FutureBalanceChart } from "@/components/dashboard/Charts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import type { Transaction, Category, Account, Budget } from "@/lib/definitions";
import { useCollection, useUser, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { subMonths, startOfMonth, endOfMonth, format, addMonths } from 'date-fns';
import { Loader } from 'lucide-react';


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const accountsQuery = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/accounts`) : null, [firestore, user]);
  const categoriesQuery = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/categories`) : null, [firestore, user]);

  const now = useMemo(() => new Date(), []);
  const currentMonthStr = useMemo(() => format(now, 'yyyy-MM'), [now]);
  const startOfCurrentMonth = useMemo(() => startOfMonth(now), [now]);
  const endOfCurrentMonth = useMemo(() => endOfMonth(now), [now]);
  
  // Transactions for cards
  const currentMonthTransactionsQuery = useMemoFirebase(() =>
    user ? query(
      collection(firestore, `users/${user.uid}/transactions`),
      where('date', '>=', startOfCurrentMonth.toISOString()),
      where('date', '<=', endOfCurrentMonth.toISOString())
    ) : null, [firestore, user, startOfCurrentMonth, endOfCurrentMonth]
  );
  
  // All transactions for balance and charts
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
    const paidOrReceivedStatuses = ['PAID', 'RECEIVED'];
    
    // Balance considers all paid/received transactions
    const balance = (allTransactions || [])
        .filter(t => paidOrReceivedStatuses.includes(t.status))
        .reduce((acc, t) => acc + t.value, 0);

    const transactionsThisMonth = currentMonthTransactions || [];
    
    const income = transactionsThisMonth
        .filter(t => t.type === 'income' && paidOrReceivedStatuses.includes(t.status))
        .reduce((acc, t) => acc + t.value, 0);
    const expenses = transactionsThisMonth
        .filter(t => t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
        .reduce((acc, t) => acc + t.value, 0);
    const pendingBills = transactionsThisMonth
        .filter(t => t.type === 'expense' && t.status === 'PENDING')
        .reduce((acc, t) => acc + t.value, 0);

    const totalBudget = (budgets || []).reduce((acc, b) => acc + b.limit, 0);
    
    const categorySpending = (categories || [])
      .filter(c => c.type === 'expense')
      .map(category => {
          const total = transactionsThisMonth
              .filter(t => t.categoryId === category.id && t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
              .reduce((acc, t) => acc + Math.abs(t.value), 0);
          return { category: category.name, total, fill: category.color };
      })
      .filter(c => c.total > 0);

    const recentTransactions = (recentTransactionsData || [])
      .map(t => {
          const category = (categories || []).find(c => c.id === t.categoryId);
          return {...t, categoryColor: category?.color || '#A9A9A9'}
      });
      
    const monthlyFlow = Array.from({ length: 12 }, (_, i) => {
        const monthDate = subMonths(new Date(), i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        const monthTransactions = (allTransactions || []).filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end && paidOrReceivedStatuses.includes(t.status);
        });
        
        return {
            month: start.toLocaleString('pt-BR', { month: 'short' }),
            income: monthTransactions.filter(t=> t.type === 'income').reduce((acc, t) => acc + t.value, 0),
            expenses: monthTransactions.filter(t=> t.type === 'expense').reduce((acc, t) => acc + t.value, 0)
        }
    }).reverse();

    const futureBalance = Array.from({ length: 12 }, (_, i) => {
        const monthDate = addMonths(startOfCurrentMonth, i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        const futureTransactions = (allTransactions || []).filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });

        const monthlyNet = futureTransactions.reduce((acc, t) => acc + t.value, 0);

        return {
            month: start.toLocaleString('pt-BR', { month: 'short' }),
            net: monthlyNet,
        }
    });

    let cumulativeBalance = balance;
    const futureBalanceProjection = futureBalance.map(item => {
        cumulativeBalance += item.net;
        return {
            month: item.month,
            balance: cumulativeBalance
        };
    });
      
    return {
      accounts: accounts || [],
      categories: categories || [],
      balance,
      income,
      expenses,
      pendingBills: Math.abs(pendingBills),
      totalBudget: totalBudget,
      spentThisMonth: Math.abs(expenses),
      categorySpending,
      monthlyFlow: monthlyFlow.map(d => ({ ...d, expenses: Math.abs(d.expenses) })),
      recentTransactions,
      futureBalanceProjection,
    };
  }

  const data = getDashboardData();
  const isLoading = loadingAccounts || loadingCategories || loadingCurrentMonthTransactions || loadingRecent || loadingAllTransactions || loadingBudgets;
  
  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 animate-spin" />
        </div>
      )
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
        pendingBills={data.pendingBills}
      />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MonthlyFlowChart data={data.monthlyFlow} />
        </div>
        <div className="lg:col-span-2">
          <CategoryChart data={data.categorySpending} />
        </div>
      </div>
        <div className="grid gap-6">
            <FutureBalanceChart data={data.futureBalanceProjection} />
        </div>
      <RecentTransactions transactions={data.recentTransactions} />
    </div>
  );
}
