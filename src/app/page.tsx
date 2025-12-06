
'use client';
import { useMemo, useState } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { CategoryChart, MonthlyFlowChart } from "@/components/dashboard/Charts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, format, isSameMonth } from 'date-fns';
import { Loader } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { GoalsCarousel } from '@/components/dashboard/GoalsCarousel';
import { SummaryReport } from '@/components/dashboard/SummaryReport';
import { MonthYearPicker } from '@/components/shared/MonthYearPicker';


export default function DashboardPage() {
  const { 
    accounts, 
    categories, 
    allTransactions, 
    budgets, 
    goals,
    isLoading 
  } = useData();

  const [currentDate, setCurrentDate] = useState(new Date());

  const startOfSelectedMonth = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const endOfSelectedMonth = useMemo(() => endOfMonth(currentDate), [currentDate]);
  const isCurrentMonth = useMemo(() => isSameMonth(currentDate, new Date()), [currentDate]);
  
  const selectedMonthTransactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startOfSelectedMonth && tDate <= endOfSelectedMonth;
    });
  }, [allTransactions, startOfSelectedMonth, endOfSelectedMonth]);

  const currentYearTransactions = useMemo(() => {
    if (!allTransactions) return [];
    const now = new Date();
    const startOfCurrentYear = startOfYear(now);
    const endOfCurrentYear = endOfYear(now);
    return allTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startOfCurrentYear && tDate <= endOfCurrentYear;
    });
  }, [allTransactions]);

  const paidOrReceivedStatuses = ['PAID', 'RECEIVED'];
  
  const balance = useMemo(() => {
    // Balance is the sum of all accounts balances, except credit cards.
    return (accounts || [])
        .filter(a => a.type !== 'CartaoCredito')
        .reduce((acc, a) => acc + a.balance, 0);
  }, [accounts]);

  const income = useMemo(() => {
    return selectedMonthTransactions
        .filter(t => t.type === 'income' && paidOrReceivedStatuses.includes(t.status))
        .reduce((acc, t) => acc + t.value, 0);
  }, [selectedMonthTransactions]);

  const expenses = useMemo(() => {
    return selectedMonthTransactions
        .filter(t => t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
        .reduce((acc, t) => acc + t.value, 0);
  }, [selectedMonthTransactions]);

  const totalBudget = useMemo(() => {
    const selectedMonthString = format(currentDate, 'yyyy-MM');
    const budgetForMonth = (budgets || []).find(b => b.month === selectedMonthString);
    return budgetForMonth ? budgetForMonth.limit : 0;
  }, [budgets, currentDate]);
  
  const spentThisMonth = useMemo(() => {
    return selectedMonthTransactions
        .filter(t => t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
        .reduce((acc, t) => acc + Math.abs(t.value), 0);
  }, [selectedMonthTransactions]);
      
  const categorySpending = useMemo(() => {
    return (categories || [])
      .filter(c => c.type === 'expense')
      .map(category => {
          const total = selectedMonthTransactions
              .filter(t => t.categoryId === category.id && t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
              .reduce((acc, t) => acc + Math.abs(t.value), 0);
          return { category: category.name, total, fill: category.color };
      })
      .filter(c => c.total > 0);
  }, [categories, selectedMonthTransactions]);

  const recentTransactions = useMemo(() => {
    return (selectedMonthTransactions || [])
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedMonthTransactions]);
      
  const monthlyFlow = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
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
    }).reverse().map(d => ({ ...d, expenses: Math.abs(d.expenses) }));
  }, [allTransactions]);

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 animate-spin" />
        </div>
      )
  }

  return (
    <div className="flex flex-col flex-1 gap-8">
      <PageHeader title="Painel de Controle">
        <MonthYearPicker date={currentDate} onDateChange={setCurrentDate} />
        <TransactionDialog accounts={accounts || []} categories={categories || []} />
      </PageHeader>

      <OverviewCards 
        balance={balance}
        income={income}
        expenses={Math.abs(expenses)}
        budget={totalBudget}
        spent={Math.abs(spentThisMonth)}
        isCurrentMonth={isCurrentMonth}
      />
      
      <GoalsCarousel goals={goals || []} />

      <div className="grid gap-6 md:grid-cols-2">
        <MonthlyFlowChart data={monthlyFlow} />
        <CategoryChart data={categorySpending} />
      </div>
      <SummaryReport 
        monthlyData={selectedMonthTransactions} 
        yearlyData={currentYearTransactions}
        categories={categories || []}
      />
      <RecentTransactions transactions={recentTransactions} />
    </div>
  );
}
