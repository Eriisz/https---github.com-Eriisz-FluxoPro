'use client';
import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/PageHeader";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { CategoryChart, MonthlyFlowChart } from "@/components/dashboard/Charts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { Loader } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { GoalsCarousel } from '@/components/dashboard/GoalsCarousel';
import { SummaryReport } from '@/components/dashboard/SummaryReport';
import { MonthYearPicker } from '@/components/shared/MonthYearPicker';
import type { Category, Transaction } from '@/lib/definitions';


type DashboardData = {
    totalBalance: number;
    income: number;
    expenses: number;
    totalBudget: number;
    spentThisMonth: number;
    categorySpending: { category: string; total: number; fill: string; }[];
    recentTransactions: Transaction[];
    monthlyFlow: { month: string; income: number; expenses: number; }[];
    pendingExpenses: number;
    selectedMonthTransactions: Transaction[];
    currentYearTransactions: Transaction[];
};

const initialDashboardData: DashboardData = {
    totalBalance: 0,
    income: 0,
    expenses: 0,
    totalBudget: 0,
    spentThisMonth: 0,
    categorySpending: [],
    recentTransactions: [],
    monthlyFlow: [],
    pendingExpenses: 0,
    selectedMonthTransactions: [],
    currentYearTransactions: [],
};


export default function DashboardPage() {
  const { 
    accounts, 
    categories, 
    allTransactions, 
    budgets, 
    goals,
    isLoading: isDataLoading 
  } = useData();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    if (isDataLoading) {
        setIsCalculating(true);
        return;
    }

    setIsCalculating(true);

    const processData = () => {
        const startOfSelectedMonth = startOfMonth(currentDate);
        const endOfSelectedMonth = endOfMonth(currentDate);
        
        const selectedMonthTransactions = (allTransactions || []).filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startOfSelectedMonth && tDate <= endOfSelectedMonth;
        });

        const transactionsBeforeSelectedMonth = (allTransactions || []).filter(t => {
            const tDate = new Date(t.date);
            return tDate < startOfSelectedMonth;
        });

        const currentYearTransactions = (allTransactions || []).filter(t => {
          const now = new Date();
          const startOfCurrentYear = startOfYear(now);
          const endOfCurrentYear = endOfYear(now);
          const tDate = new Date(t.date);
          return tDate >= startOfCurrentYear && tDate <= endOfCurrentYear;
        });

        const paidOrReceivedStatuses = ['PAID', 'RECEIVED'];
        
        // Calculate the balance at the beginning of the selected month
        const balanceAtStartOfMonth = (accounts || []).filter(acc => acc.type !== 'CartaoCredito')
          .reduce((total, account) => {
            const historicalTransactionsForAccount = transactionsBeforeSelectedMonth.filter(t => 
                t.accountId === account.id && 
                paidOrReceivedStatuses.includes(t.status)
            );
            const totalFromTransactions = historicalTransactionsForAccount.reduce((sum, t) => sum + t.value, 0);
            return total + (account.initialBalance || 0) + totalFromTransactions;
        }, 0);

        // Calculate the net flow for the selected month, including all statuses for projection
        const projectedNetFlowForMonth = selectedMonthTransactions.reduce((acc, t) => acc + t.value, 0);

        // Projected balance at the end of the month
        const totalBalance = balanceAtStartOfMonth + projectedNetFlowForMonth;

        const income = selectedMonthTransactions
            .filter(t => t.type === 'income' && paidOrReceivedStatuses.includes(t.status))
            .reduce((acc, t) => acc + t.value, 0);

        const expenses = selectedMonthTransactions
            .filter(t => t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
            .reduce((acc, t) => acc + t.value, 0);

        const selectedMonthString = format(currentDate, 'yyyy-MM');
        const budgetForMonth = (budgets || []).find(b => b.month === selectedMonthString);
        const totalBudget = budgetForMonth ? budgetForMonth.limit : 0;
        
        const spentThisMonth = selectedMonthTransactions
            .filter(t => t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
            .reduce((acc, t) => acc + Math.abs(t.value), 0);
            
        const categorySpending = (categories || [])
          .filter(c => c.type === 'expense')
          .map(category => {
              const total = selectedMonthTransactions
                  .filter(t => t.categoryId === category.id && t.type === 'expense' && paidOrReceivedStatuses.includes(t.status))
                  .reduce((acc, t) => acc + Math.abs(t.value), 0);
              return { category: category.name, total, fill: category.color };
          })
          .filter(c => c.total > 0);

        const recentTransactions = (selectedMonthTransactions || [])
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
        }).reverse().map(d => ({ ...d, expenses: Math.abs(d.expenses) }));

        const pendingExpenses = selectedMonthTransactions
          .filter(t => t.type === 'expense' && (t.status === 'PENDING' || t.status === 'LATE'))
          .reduce((acc, t) => acc + Math.abs(t.value), 0);

        setDashboardData({
          totalBalance,
          income,
          expenses,
          totalBudget,
          spentThisMonth,
          categorySpending,
          recentTransactions,
          monthlyFlow,
          pendingExpenses,
          selectedMonthTransactions,
          currentYearTransactions,
        });
        setIsCalculating(false);
    };
    
    processData();

  }, [accounts, categories, allTransactions, budgets, currentDate, isDataLoading]);


  if (isDataLoading || isCalculating) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 animate-spin" />
        </div>
      )
  }

  const {
    totalBalance,
    income,
    expenses,
    totalBudget,
    spentThisMonth,
    categorySpending,
    recentTransactions,
    monthlyFlow,
    pendingExpenses,
    selectedMonthTransactions,
    currentYearTransactions,
  } = dashboardData;

  return (
    <div className="flex flex-col flex-1 gap-8">
      <PageHeader title="Painel de Controle">
        <MonthYearPicker date={currentDate} onDateChange={setCurrentDate} />
        <TransactionDialog accounts={accounts || []} categories={categories || []} />
      </PageHeader>

      <OverviewCards 
        balance={totalBalance}
        income={income}
        expenses={expenses}
        budget={totalBudget}
        spent={spentThisMonth}
        pendingExpenses={pendingExpenses}
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
