'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { CategoryChart, MonthlyFlowChart } from '@/components/dashboard/Charts';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { subMonths, format } from 'date-fns';
import { Loader } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { GoalsCarousel } from '@/components/dashboard/GoalsCarousel';
import { SummaryReport } from '@/components/dashboard/SummaryReport';
import { MonthYearPicker } from '@/components/shared/MonthYearPicker';
import { InsightsBanner } from '@/components/dashboard/InsightsBanner';
import { CashFlowForecast } from '@/components/dashboard/CashFlowForecast';
import { ReminderCenter } from '@/components/reminders/ReminderCenter';
import { transactionCycle } from '@/lib/cards';
import type { Transaction } from '@/lib/definitions';
import {
  belongsToMonth,
  belongsToYear,
  sumMonthlyExpenses,
  sumMonthlyPendingExpenses,
  sumMonthlyPendingIncome,
  sumSettledExpenses,
  sumSettledIncome,
} from '@/lib/finance-engine';

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
  pendingIncome: number;
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
  pendingIncome: 0,
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

    const transactions = allTransactions || [];

    const selectedMonthTransactions = transactions.filter((transaction) =>
      belongsToMonth(transaction.date, currentDate),
    );

    const selectedYearTransactions = transactions.filter((transaction) =>
      belongsToYear(transaction.date, currentDate),
    );

    const settledMonth = transactions.filter(row => belongsToMonth(row.paidAt || row.date, currentDate));
    const income = sumSettledIncome(settledMonth);
    const expenses = sumSettledExpenses(settledMonth);
    const allExpenses = sumMonthlyExpenses(selectedMonthTransactions);
    const monthlyNet = income + expenses;

    const selectedMonthString = format(currentDate, 'yyyy-MM');
    const budgetForMonth = (budgets || []).find((budget) => budget.month === selectedMonthString && !budget.categoryId);
    const totalBudget = budgetForMonth ? budgetForMonth.limit : 0;
    const spentThisMonth = allExpenses;

    const categorySpending = (categories || [])
      .filter((category) => category.type === 'expense')
      .map((category) => {
        const total = sumMonthlyExpenses(
          selectedMonthTransactions.filter((transaction) => transaction.categoryId === category.id),
        );
        return { category: category.name, total, fill: category.color };
      })
      .filter((category) => category.total > 0);

    const recentTransactions = [...selectedMonthTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthlyFlow = Array.from({ length: 12 }, (_, index) => {
      const monthDate = subMonths(currentDate, index);
      const monthTransactions = transactions.filter((transaction) =>
        belongsToMonth(transaction.date, monthDate),
      );

      return {
        month: monthDate.toLocaleString('pt-BR', { month: 'short' }),
        income: sumSettledIncome(monthTransactions),
        expenses: sumMonthlyExpenses(monthTransactions),
      };
    }).reverse();

    const dueThisMonth = transactions.filter(row => {
      const card = (accounts || []).find(account => account.id === row.accountId && account.type === 'CartaoCredito');
      const date = card ? transactionCycle(row, card, transactions)?.invoiceDueDate || row.date : row.date;
      return belongsToMonth(date, currentDate);
    });
    const pendingExpenses = sumMonthlyPendingExpenses(dueThisMonth);
    const pendingIncome = sumMonthlyPendingIncome(dueThisMonth);

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
      pendingIncome,
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
    allExpenses,
    totalBudget,
    spentThisMonth,
    categorySpending,
    recentTransactions,
    monthlyFlow,
    pendingExpenses,
    pendingIncome,
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
          pendingIncome={pendingIncome}
        />
      </section>

      <InsightsBanner
        isDemo={isDemo}
        income={income}
        expenses={allExpenses}
        categorySpending={categorySpending}
        pendingExpenses={pendingExpenses}
        budget={totalBudget}
        spent={spentThisMonth}
      />

      <ReminderCenter compact />
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