'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { AdvancedFilters } from '@/components/search/AdvancedFilters';
import { HistoryTable } from '@/components/history/HistoryTable';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/context/DataContext';
import { formatCurrency } from '@/lib/utils';
import {
  EMPTY_FILTERS,
  filterTransactions,
  loadSavedSearches,
  persistSavedSearches,
  type SavedSearch,
  type SearchFilters,
} from '@/lib/finance-engine';
import type { Transaction } from '@/lib/definitions';
import { BookmarkPlus, Loader } from 'lucide-react';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const { allTransactions, categories, accounts, goals, isLoading, isBalanceVisible } = useData();
  const [filters, setFilters] = useState<SearchFilters>({
    ...EMPTY_FILTERS,
    query: searchParams.get('q') || '',
    allPeriods: true,
  });
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [apiTotal, setApiTotal] = useState<number | null>(null);

  useEffect(() => {
    setSaved(loadSavedSearches());
  }, []);

  const results = useMemo(
    () =>
      filterTransactions(allTransactions || [], categories || [], accounts || [], filters),
    [allTransactions, categories, accounts, filters]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            query: filters.query,
            filters,
            transactions: allTransactions || [],
            accounts: accounts || [],
            categories: categories || [],
            goals: goals || [],
          }),
        });
        const json = await response.json();
        if (json?.ok) setApiTotal(json.total);
      } catch {
        setApiTotal(null);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [filters, allTransactions, accounts, categories, goals]);

  const totals = useMemo(() => {
    const income = results.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.value, 0);
    const expenses = results.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.value, 0);
    return { income, expenses, count: results.length };
  }, [results]);

  const saveCurrent = () => {
    const item: SavedSearch = {
      id: crypto.randomUUID(),
      name: filters.query.trim() || 'Pesquisa filtrada',
      query: filters.query,
      filters,
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...saved].slice(0, 12);
    setSaved(next);
    persistSavedSearches(next);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pesquisa avançada">
        <Button variant="outline" onClick={saveCurrent}>
          <BookmarkPlus className="mr-2 h-4 w-4" />
          Salvar pesquisa
        </Button>
      </PageHeader>

      <AdvancedFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({ ...EMPTY_FILTERS, allPeriods: true })}
        categories={categories || []}
        accounts={accounts || []}
        showPeriodToggle={false}
      />

      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {saved.map((item) => (
            <Button key={item.id} size="sm" variant="secondary" onClick={() => setFilters(item.filters)}>
              {item.name}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="luxury-card">
          <CardHeader><CardTitle className="text-sm">Resultados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-headline">{apiTotal ?? totals.count}</CardContent>
        </Card>
        <Card className="luxury-card">
          <CardHeader><CardTitle className="text-sm">Receitas encontradas</CardTitle></CardHeader>
          <CardContent className="text-2xl font-headline text-primary">
            {isBalanceVisible ? formatCurrency(totals.income) : '•••••'}
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardHeader><CardTitle className="text-sm">Despesas encontradas</CardTitle></CardHeader>
          <CardContent className="text-2xl font-headline text-destructive">
            {isBalanceVisible ? formatCurrency(Math.abs(totals.expenses)) : '•••••'}
          </CardContent>
        </Card>
      </div>

      <Card className="luxury-card">
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
          <CardDescription>
            Motor de busca com linguagem natural, filtros e API de pesquisa FluxoPro v2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryTable
            transactions={results}
            onEdit={(transaction) => {
              setSelectedTransaction(transaction);
              setDialogOpen(true);
            }}
            total={totals.income + totals.expenses}
          />
        </CardContent>
      </Card>

      {selectedTransaction && (
        <TransactionDialog
          accounts={accounts || []}
          categories={categories || []}
          isOpen={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedTransaction(undefined);
          }}
          transaction={selectedTransaction}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
