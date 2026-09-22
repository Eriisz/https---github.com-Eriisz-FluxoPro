'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useData } from '@/context/DataContext';
import { formatCurrency } from '@/lib/utils';
import { searchWorkspace, type SearchHit } from '@/lib/finance-engine';
import { Landmark, LayoutDashboard, Search, Tags, Target, Wallet } from 'lucide-react';

const ICONS = {
  page: LayoutDashboard,
  transaction: Wallet,
  account: Landmark,
  category: Tags,
  goal: Target,
};

export function GlobalSearch() {
  const router = useRouter();
  const { allTransactions, accounts, categories, goals, isBalanceVisible } = useData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('fluxopro:open-search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('fluxopro:open-search', onOpen);
    };
  }, []);

  const hits = useMemo(
    () =>
      searchWorkspace({
        query,
        transactions: allTransactions || [],
        accounts: accounts || [],
        categories: categories || [],
        goals: goals || [],
        limit: 12,
      }),
    [query, allTransactions, accounts, categories, goals]
  );

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQuery('');
    router.push(hit.href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden border-primary/20 p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Pesquisa FluxoPro</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-primary/15 px-4 py-3">
          <Search className="h-4 w-4 text-primary" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar transações, contas, metas..."
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((value) => Math.min(hits.length - 1, value + 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((value) => Math.max(0, value - 1));
              }
              if (event.key === 'Enter' && hits[active]) go(hits[active]);
            }}
          />
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {hits.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhum resultado para essa pesquisa.</p>
          )}
          {hits.map((hit, index) => {
            const Icon = ICONS[hit.kind];
            return (
              <button
                key={`${hit.kind}-${hit.id}`}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
                  index === active ? 'bg-primary/15' : 'hover:bg-muted/60'
                }`}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(hit)}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>
                    <span className="block text-sm font-medium">{hit.title}</span>
                    <span className="block text-xs text-muted-foreground">{hit.subtitle}</span>
                  </span>
                </span>
                {hit.amount !== undefined && (
                  <span className="text-xs font-semibold text-primary">
                    {isBalanceVisible ? formatCurrency(hit.amount) : '•••••'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="border-t border-primary/10 px-4 py-2 text-[11px] text-muted-foreground">
          Ctrl/⌘ + K abre a busca · Enter abre o resultado · Pesquisa avançada em /search
        </div>
      </DialogContent>
    </Dialog>
  );
}
