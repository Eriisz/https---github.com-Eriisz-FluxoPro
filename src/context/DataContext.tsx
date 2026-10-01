
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useUser, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Account, Category, Budget, Goal, Transaction } from '@/lib/definitions';
import { Loader } from 'lucide-react';

interface DataContextProps {
  accounts: Account[] | null;
  categories: Category[] | null;
  budgets: Budget[] | null;
  goals: Goal[] | null;
  allTransactions: Transaction[] | null;
  isLoading: boolean;
  isBalanceVisible: boolean;
  toggleBalanceVisibility: () => void;
  isDemo: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

function buildDemoData(referenceDate: Date) {
  const dateAtNoon = (year: number, month: number, day: number) =>
    new Date(year, month, day, 12, 0, 0).toISOString();
  const demoUserId = 'fluxopro-demo';
  const categories: Category[] = [
    { id: 'salary', userId: demoUserId, name: 'Salário', color: '#15803d', type: 'income' },
    { id: 'housing', userId: demoUserId, name: 'Moradia', color: '#2563eb', type: 'expense' },
    { id: 'food', userId: demoUserId, name: 'Alimentação', color: '#f59e0b', type: 'expense' },
    { id: 'transport', userId: demoUserId, name: 'Transporte', color: '#8b5cf6', type: 'expense' },
    { id: 'health', userId: demoUserId, name: 'Saúde', color: '#ec4899', type: 'expense' },
    { id: 'leisure', userId: demoUserId, name: 'Lazer', color: '#06b6d4', type: 'expense' },
  ];
  const transactions: Transaction[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1);
    const isCurrentMonth = offset === 0;
    const monthTransactions: Omit<Transaction, 'id' | 'userId'>[] = [
      {
        description: 'Salário mensal',
        value: 12800,
        date: dateAtNoon(month.getFullYear(), month.getMonth(), 5),
        categoryId: 'salary',
        accountId: 'checking',
        type: 'income',
        status: 'RECEIVED',
      },
      {
        description: 'Aluguel e condomínio',
        value: -2800,
        date: dateAtNoon(month.getFullYear(), month.getMonth(), 6),
        categoryId: 'housing',
        accountId: 'checking',
        type: 'expense',
        status: 'PAID',
      },
      {
        description: 'Mercado',
        value: -950,
        date: dateAtNoon(month.getFullYear(), month.getMonth(), 12),
        categoryId: 'food',
        accountId: 'checking',
        type: 'expense',
        status: 'PAID',
      },
      {
        description: 'Transporte',
        value: -630,
        date: dateAtNoon(month.getFullYear(), month.getMonth(), 16),
        categoryId: 'transport',
        accountId: 'checking',
        type: 'expense',
        status: 'PAID',
      },
      {
        description: 'Plano de saúde',
        value: -420,
        date: dateAtNoon(month.getFullYear(), month.getMonth(), 19),
        categoryId: 'health',
        accountId: 'checking',
        type: 'expense',
        status: 'PAID',
      },
      {
        description: 'Restaurantes e lazer',
        value: -1000,
        date: dateAtNoon(month.getFullYear(), month.getMonth(), 24),
        categoryId: 'leisure',
        accountId: 'checking',
        type: 'expense',
        status: 'PAID',
      },
    ];

    if (isCurrentMonth) {
      monthTransactions[4] = { ...monthTransactions[4], status: 'PENDING' };
      monthTransactions.push(
        {
          description: 'Conta de energia',
          value: -285,
          date: dateAtNoon(month.getFullYear(), month.getMonth(), 27),
          categoryId: 'housing',
          accountId: 'checking',
          type: 'expense',
          status: 'PENDING',
        },
        {
          description: 'Projeto extra',
          value: 1200,
          date: dateAtNoon(month.getFullYear(), month.getMonth(), 29),
          categoryId: 'salary',
          accountId: 'checking',
          type: 'income',
          status: 'PENDING',
        },
      );
    }

    monthTransactions.forEach((transaction, index) => {
      transactions.push({
        ...transaction,
        id: `demo-${offset}-${index}`,
        userId: demoUserId,
      });
    });
  }

  return {
    accounts: [
      { id: 'checking', userId: demoUserId, name: 'Conta principal', type: 'ContaCorrente' as const, initialBalance: 18500 },
      { id: 'reserve', userId: demoUserId, name: 'Reserva', type: 'Investimento' as const, initialBalance: 7200 },
    ],
    categories,
    budgets: [{
      id: 'current-month-budget',
      userId: demoUserId,
      month: `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`,
      limit: 6500,
    }],
    goals: [{
      id: 'emergency-fund',
      userId: demoUserId,
      name: 'Reserva de emergência',
      targetAmount: 30000,
      currentAmount: 18750,
      targetDate: dateAtNoon(referenceDate.getFullYear(), referenceDate.getMonth() + 8, 1),
    }],
    allTransactions: transactions,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  useEffect(() => {
    const storedVisibility = localStorage.getItem('isBalanceVisible');
    if (storedVisibility !== null) {
      setIsBalanceVisible(JSON.parse(storedVisibility));
    }
  }, []);

  const toggleBalanceVisibility = useCallback(() => {
    setIsBalanceVisible(prev => {
        const newState = !prev;
        localStorage.setItem('isBalanceVisible', JSON.stringify(newState));
        return newState;
    });
  }, []);

  // Accounts
  const accountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/accounts`) : null),
    [firestore, user]
  );
  const { data: accounts, isLoading: loadingAccounts } = useCollection<Account>(accountsQuery);

  // Categories
  const categoriesQuery = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/categories`) : null),
    [firestore, user]
  );
  const { data: categories, isLoading: loadingCategories } = useCollection<Category>(categoriesQuery);

  // Budgets
  const budgetsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/budgets`)) : null),
    [firestore, user]
  );
  const { data: budgets, isLoading: loadingBudgets } = useCollection<Budget>(budgetsQuery);

  // Goals
  const goalsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/goals`)) : null),
    [firestore, user]
  );
  const { data: goals, isLoading: loadingGoals } = useCollection<Goal>(goalsQuery);

  // All Transactions
  const allTransactionsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/transactions`)) : null),
    [firestore, user]
  );
  const { data: allTransactions, isLoading: loadingAllTransactions } = useCollection<Transaction>(allTransactionsQuery);

  const isLoading =
    loadingAccounts ||
    loadingCategories ||
    loadingBudgets ||
    loadingGoals ||
    loadingAllTransactions;
    
  const value = {
    accounts,
    categories,
    budgets,
    goals,
    allTransactions,
    isLoading,
    isBalanceVisible,
    toggleBalanceVisibility,
    isDemo: false,
  };

  return (
    <DataContext.Provider value={value}>
        {isLoading && pathname !== '/demo' ? (
             <div className="flex items-center justify-center h-full min-h-screen">
                <Loader className="w-8 h-8 animate-spin" />
            </div>
        ) : children}
    </DataContext.Provider>
  );
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const demoData = useMemo(() => buildDemoData(new Date()), []);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const toggleBalanceVisibility = useCallback(() => {
    setIsBalanceVisible((visible) => !visible);
  }, []);

  return (
    <DataContext.Provider
      value={{
        ...demoData,
        isLoading: false,
        isBalanceVisible,
        toggleBalanceVisibility,
        isDemo: true,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextProps {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
