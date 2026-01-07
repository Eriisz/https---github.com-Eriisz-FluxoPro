
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
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
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
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
  };

  return (
    <DataContext.Provider value={value}>
        {isLoading ? (
             <div className="flex items-center justify-center h-full min-h-screen">
                <Loader className="w-8 h-8 animate-spin" />
            </div>
        ) : children}
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
