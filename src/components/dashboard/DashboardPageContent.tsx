'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { CategoryChart, MonthlyFlowChart } from '@/components/dashboard/Charts';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { Loader } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { GoalsCarousel } from '@/components/dashboard/GoalsCarousel';
import { SummaryReport } from '@/components/dashboard/SummaryReport';
import { MonthYearPicker } from '@/components/shared/MonthYearPicker';
import { InsightsBanner } from '@/components/dashboard/InsightsBanner';
import { CashFlowForecast } from '@/components/dashboard/CashFlowForecast';
import type { Transaction } from '@/lib/definitions';

type DashboardData = {
  monthlyNet: number;
  income: number;
  expenses: number;
  allExpenses: number;
  totalBudget: number;
  spentThisMonth: number;
  categorySpending: { category: string; total: number; fill: string }[];
  recentTransactions: Transaction[];
  monthlyFlow: { month: string; income: number; expenses: number }[];
  pendingExpenses: number;
  selectedMonthTransactions: Transaction[];
  selectedYearTransactions: Transaction[];
};

const initialDashboardData: DashboardData = {
  monthlyNet: 0,
  income: 0,
  expenses: 0,
  allExpenses: 0,
  totalBudget: 0,
  spentThisMonth: 0,
  categorySpending: [],
  recentTransactions: [],
  monthlyFlow: [],
  pendingExpenses: 0,
  selectedMonthTransactions: [],
  selectedYearTransactions: [],
};

export function DashboardPageContent() {
  const {
    accounts,
    categories,
    allTransactions,
    budgets,
    goals,
    isLoading: isDataLoading,
    isDemo,
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

    const selectedMonthStart = startOfMonth(currentDate);
    const selectedMonthEnd = endOfMonth(currentDate);
    const selectedYearStart = startOfYear(currentDate);
    const selectedYearEnd = endOfYear(currentDate);
    const transactions = allTransactions || [];

    const selectedMonthTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= selectedMonthStart && transactionDate <= selectedMonthEnd;
    });

    const selectedYearTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= selectedYearStart && transactionDate <= selectedYearEnd;
    });

    const paidOrReceivedStatuses = ['PAID', 'RECEIVED'];
    const income = selectedMonthTransactions
      .filter((transaction) => transaction.type === 'income' && paidOrReceivedStatuses.includes(transaction.status))
      .reduce((total, transaction) => total + transaction.value, 0);
    const expenses = selectedMonthTransactions
      .filter((transaction) => transaction.type === 'expense' && paidOrReceivedStatuses.includes(transaction.status))
      .reduce((total, transaction) => total + transaction.value, 0);
    const allExpenses = selectedMonthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((total, transaction) => total + Math.abs(transaction.value), 0);
    const monthlyNet = income + expenses;

    const selectedMonthString = format(currentDate, 'yyyy-MM');
    const budgetForMonth = (budgets || []).find((budget) => budget.month === selectedMonthString);
    const totalBudget = budgetForMonth ? budgetForMonth.limit : 0;
    const spentThisMonth = selectedMonthTransactions
      .filter((transaction) => transaction.type === 'expense' && paidOrReceivedStatuses.includes(transaction.status))
      .reduce((total, transaction) => total + Math.abs(transaction.value), 0);

    const categorySpending = (categories || [])
      .filter((category) => category.type === 'expense')
      .map((category) => {
        const total = selectedMonthTransactions
          .filter((transaction) =>
            transaction.categoryId === category.id &&
            transaction.type === 'expense' &&
            paidOrReceivedStatuses.includes(transaction.status),
          )
          .reduce((sum, transaction) => sum + Math.abs(transaction.value), 0);
        return { category: category.name, total, fill: category.color };
      })
      .filter((category) => category.total > 0);

    const recentTransactions = [...selectedMonthTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthlyFlow = Array.from({ length: 12 }, (_, index) => {
      const monthDate = subMonths(new Date(), index);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const monthTransactions = transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= start &&
          transactionDate <= end &&
          paidOrReceivedStatuses.includes(transaction.status);
      });

      return {
        month: start.toLocaleString('pt-BR', { month: 'short' }),
        income: monthTransactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + transaction.value, 0),
        expenses: monthTransactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + transaction.value, 0),
      };
    }).reverse().map((month) => ({ ...month, expenses: Math.abs(month.expenses) }));

    const pendingExpenses = selectedMonthTransactions
      .filter((transaction) =>
        transaction.type === 'expense' &&
        (transaction.status === 'PENDING' || transaction.status === 'LATE'),
      )
      .reduce((total, transaction) => total + Math.abs(transaction.value), 0);

    setDashboardData({
      monthlyNet,
      income,
      expenses,
      allExpenses,
      totalBudget,
      spentThisMonth,
      categorySpending,
      recentTransactions,
      monthlyFlow,
      pendingExpenses,
      selectedMonthTransactions,
      selectedYearTransactions,
    });
    setIsCalculating(false);
  }, [accounts, categories, allTransactions, budgets, currentDate, isDataLoading]);

  if (isDataLoading || isCalculating) {
    return (
      <div className="flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const {
    monthlyNet,
    income,
    expenses,
    allExpenses,
    totalBudget,
    spentThisMonth,
    categorySpending,
    recentTransactions,
    monthlyFlow,
    pendingExpenses,
    selectedMonthTransactions,
    selectedYearTransactions,
  } = dashboardData;

  return (
    <div className="dash-stack flex flex-col flex-1">
      <PageHeader title="Painel de Controle">
        <MonthYearPicker date={currentDate} onDateChange={setCurrentDate} />
        {!isDemo && <TransactionDialog accounts={accounts || []} categories={categories || []} />}
      </PageHeader>

      <section id="overview-cards" aria-label="Resumo financeiro">
        <OverviewCards
          monthlyNet={monthlyNet}
          income={income}
          expenses={allExpenses}
          budget={totalBudget}
          spent={spentThisMonth}
          pendingExpenses={pendingExpenses}
        />
      </section>

      <InsightsBanner
        isDemo={isDemo}
        income={income}
        expenses={expenses}
        categorySpending={categorySpending}
        pendingExpenses={pendingExpenses}
        budget={totalBudget}
        spent={spentThisMonth}
      />

      <GoalsCarousel goals={goals || []} />

      <div className="dash-charts">
        <MonthlyFlowChart data={monthlyFlow} />
        <CategoryChart data={categorySpending} />
      </div>

      <CashFlowForecast accounts={accounts || []} transactions={allTransactions || []} />

      <SummaryReport
        monthlyData={selectedMonthTransactions}
        yearlyData={selectedYearTransactions}
        categories={categories || []}
        periodDate={currentDate}
      />
      <RecentTransactions transactions={recentTransactions} isDemo={isDemo} />
    </div>
  );
}