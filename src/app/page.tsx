
'use client';
import { useMemo, useState } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { CategoryChart, MonthlyFlowChart } from "@/components/dashboard/Charts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Loader } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { GoalsCarousel } from '@/components/dashboard/GoalsCarousel';
import { SummaryReport } from '@/components/dashboard/SummaryReport';


export default function DashboardPage() {
  const { 
    accounts, 
    categories, 
    allTransactions, 
    budgets, 
    goals,
    isLoading 
  } = useData();

  const now = useMemo(() => new Date(), []);
  const startOfCurrentMonth = useMemo(() => startOfMonth(now), [now]);
  const endOfCurrentMonth = useMemo(() => endOfMonth(now), [now]);
  const startOfCurrentYear = useMemo(() => startOfYear(now), [now]);
  const endOfCurrentYear = useMemo(() => endOfYear(now), [now]);
  
  const currentMonthTransactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startOfCurrentMonth && tDate <= endOfCurrentMonth;
    });
  }, [allTransactions, startOfCurrentMonth, endOfCurrentMonth]);

  const currentYearTransactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startOfCurrentYear && tDate <= endOfCurrentYear;
    });
  }, [allTransactions, startOfCurrentYear, endOfCurrentYear]);


  const getDashboardData = () => {
    const paidOrReceivedStatuses = ['PAID', 'RECEIVED'];
    
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
    
    const pendingExpenses = transactionsThisMonth
        .filter(t => t.type === 'expense' && t.status === 'PENDING')
        .reduce((acc, t) => acc + t.value, 0);
    
    const pendingIncome = transactionsThisMonth
        .filter(t => t.type === 'income' && t.status === 'PENDING')
        .reduce((acc, t) => acc + t.value, 0);

    const totalBudget = (budgets || []).reduce((acc, b) => acc + b.limit, 0);
    
    const spentThisMonth = transactionsThisMonth
        .filter(t => t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
        .reduce((acc, t) => acc + t.value, 0);
        
    const categorySpending = (categories || [])
      .filter(c => c.type === 'expense')
      .map(category => {
          const total = transactionsThisMonth
              .filter(t => t.categoryId === category.id && t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
              .reduce((acc, t) => acc + Math.abs(t.value), 0);
          return { category: category.name, total, fill: category.color };
      })
      .filter(c => c.total > 0);

    const recentTransactions = (currentMonthTransactions || [])
      .map(t => {
          const category = (categories || []).find(c => c.id === t.categoryId);
          const categoryName = category ? category.name : 'Sem Categoria';
          const categoryColor = category ? category.color : '#A9A9A9';
          return {...t, category: categoryName, categoryColor }
      })
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
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

      
    return {
      accounts: accounts || [],
      categories: categories || [],
      goals: goals || [],
      balance,
      income,
      expenses,
      pendingExpenses: Math.abs(pendingExpenses),
      pendingIncome: pendingIncome,
      totalBudget: totalBudget,
      spentThisMonth: Math.abs(spentThisMonth),
      categorySpending,
      monthlyFlow: monthlyFlow.map(d => ({ ...d, expenses: Math.abs(d.expenses) })),
      recentTransactions,
      monthlyTransactions: transactionsThisMonth,
      yearlyTransactions: currentYearTransactions,
    };
  }

  const data = getDashboardData();
  
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
        expenses={Math.abs(data.expenses)}
        budget={data.totalBudget}
        spent={data.spentThisMonth}
        pendingIncome={data.pendingIncome}
        pendingExpenses={data.pendingExpenses}
      />
      
      <GoalsCarousel goals={data.goals} />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MonthlyFlowChart data={data.monthlyFlow} />
        </div>
        <div className="lg:col-span-2">
          <CategoryChart data={data.categorySpending} />
        </div>
      </div>
      <SummaryReport 
        monthlyData={data.monthlyTransactions} 
        yearlyData={data.yearlyTransactions}
        categories={data.categories}
      />
      <RecentTransactions transactions={data.recentTransactions} />
    </div>
  );
}
