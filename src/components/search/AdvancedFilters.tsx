'use client';

import type { Account, Category } from '@/lib/definitions';
import type { SearchFilters } from '@/lib/finance-engine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RotateCcw } from 'lucide-react';

type AdvancedFiltersProps = {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onReset: () => void;
  categories: Category[];
  accounts: Account[];
  showPeriodToggle?: boolean;
};

export function AdvancedFilters({
  filters,
  onChange,
  onReset,
  categories,
  accounts,
  showPeriodToggle = true,
}: AdvancedFiltersProps) {
  const patch = (partial: Partial<SearchFilters>) => onChange({ ...filters, ...partial });

  return (
    <div className="luxury-card space-y-4 rounded-2xl p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <Input
          value={filters.query}
          onChange={(event) => patch({ query: event.target.value })}
          placeholder="Buscar: uber, pendente, acima de 200, recorrente..."
          className="h-11 border-primary/20 bg-background/70 pl-10"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={filters.type} onValueChange={(value) => patch({ type: value as SearchFilters['type'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={filters.status} onValueChange={(value) => patch({ status: value as SearchFilters['status'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PAID">Pago</SelectItem>
              <SelectItem value="RECEIVED">Recebido</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="LATE">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={filters.categoryId} onValueChange={(value) => patch({ categoryId: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Conta</Label>
          <Select value={filters.accountId} onValueChange={(value) => patch({ accountId: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>De</Label>
          <Input type="date" value={filters.dateFrom} onChange={(event) => patch({ dateFrom: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Até</Label>
          <Input type="date" value={filters.dateTo} onChange={(event) => patch({ dateTo: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Valor mínimo</Label>
          <Input inputMode="decimal" value={filters.minAmount} onChange={(event) => patch({ minAmount: event.target.value })} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Valor máximo</Label>
          <Input inputMode="decimal" value={filters.maxAmount} onChange={(event) => patch({ maxAmount: event.target.value })} placeholder="5000" />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={filters.recurringOnly} onCheckedChange={(checked) => patch({ recurringOnly: checked })} />
            Somente recorrentes / parcelas
          </label>
          {showPeriodToggle && (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={filters.allPeriods} onCheckedChange={(checked) => patch({ allPeriods: checked })} />
              Buscar em todos os períodos
            </label>
          )}
        </div>
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}
