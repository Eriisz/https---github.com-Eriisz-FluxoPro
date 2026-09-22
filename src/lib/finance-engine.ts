import type { Account, Category, Goal, Transaction } from '@/lib/definitions';

export type FinanceTypeFilter = 'all' | 'income' | 'expense';
export type FinanceStatusFilter = 'all' | 'PAID' | 'PENDING' | 'RECEIVED' | 'LATE';

export type SearchFilters = {
  query: string;
  type: FinanceTypeFilter;
  status: FinanceStatusFilter;
  categoryId: string;
  accountId: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
  recurringOnly: boolean;
  allPeriods: boolean;
};

export type SearchHitKind = 'transaction' | 'account' | 'category' | 'goal' | 'page';

export type SearchHit = {
  id: string;
  kind: SearchHitKind;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  transaction?: Transaction;
  amount?: number;
};

export type InsightAlert = {
  level: 'info' | 'warning' | 'success';
  title: string;
  detail: string;
};

export type FinanceInsights = {
  healthScore: number;
  savingsRate: number;
  income: number;
  expenses: number;
  net: number;
  topCategory: { name: string; total: number } | null;
  monthOverMonth: number;
  concentration: number;
  alerts: InsightAlert[];
};

export const EMPTY_FILTERS: SearchFilters = {
  query: '',
  type: 'all',
  status: 'all',
  categoryId: 'all',
  accountId: 'all',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
  recurringOnly: false,
  allPeriods: false,
};

const PAGE_INDEX: Array<{ title: string; subtitle: string; href: string; keywords: string[] }> = [
  { title: 'Painel', subtitle: 'Visão geral e gráficos ao vivo', href: '/', keywords: ['painel', 'dashboard', 'inicio', 'graficos'] },
  { title: 'Pesquisa avançada', subtitle: 'Buscar e filtrar movimentações', href: '/search', keywords: ['pesquisa', 'busca', 'filtro', 'procurar'] },
  { title: 'Histórico', subtitle: 'Receitas e despesas do mês', href: '/history', keywords: ['historico', 'transacoes', 'extrato'] },
  { title: 'Contas', subtitle: 'Contas, cartões e saldos', href: '/accounts', keywords: ['contas', 'cartao', 'banco'] },
  { title: 'Categorias', subtitle: 'Organização de gastos e receitas', href: '/categories', keywords: ['categorias', 'tags'] },
  { title: 'Orçamentos', subtitle: 'Limites mensais', href: '/budgets', keywords: ['orcamento', 'budget', 'limite'] },
  { title: 'Metas', subtitle: 'Objetivos financeiros', href: '/goals', keywords: ['metas', 'objetivos'] },
  { title: 'Calculadoras', subtitle: 'Juros, empréstimo e inflação', href: '/calculators', keywords: ['calculadora', 'juros', 'inflacao'] },
  { title: 'Ajustes', subtitle: 'Perfil, tema e importação', href: '/settings', keywords: ['ajustes', 'configuracoes', 'perfil'] },
];

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function parseAmountToken(value: string): number | null {
  const cleaned = value.replace(/[R$\s]/gi, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseSearchQuery(raw: string): { text: string; filters: Partial<SearchFilters> } {
  let text = raw.trim();
  const filters: Partial<SearchFilters> = {};
  const normalized = normalizeText(text);

  if (/\b(despesa|despesas|gasto|gastos|saida|saidas)\b/.test(normalized)) {
    filters.type = 'expense';
  }
  if (/\b(receita|receitas|entrada|entradas|ganho|ganhos|renda)\b/.test(normalized)) {
    filters.type = 'income';
  }
  if (/\b(pendente|pendentes)\b/.test(normalized)) filters.status = 'PENDING';
  if (/\b(atrasado|atrasada|atrasados)\b/.test(normalized)) filters.status = 'LATE';
  if (/\b(pago|pagos|paga|pagas)\b/.test(normalized)) filters.status = 'PAID';
  if (/\b(recebido|recebidos)\b/.test(normalized)) filters.status = 'RECEIVED';
  if (/\b(recorrente|recorrentes|parcela|parcelado|parcelas)\b/.test(normalized)) {
    filters.recurringOnly = true;
  }

  const above = normalized.match(/\b(?:acima de|maior que|mais de|>)\s*([\d.,]+)/);
  if (above) {
    const amount = parseAmountToken(above[1]);
    if (amount !== null) filters.minAmount = String(amount);
  }
  const below = normalized.match(/\b(?:abaixo de|menor que|menos de|<)\s*([\d.,]+)/);
  if (below) {
    const amount = parseAmountToken(below[1]);
    if (amount !== null) filters.maxAmount = String(amount);
  }

  text = text
    .replace(/\b(despesa|despesas|gasto|gastos|saida|saidas|receita|receitas|entrada|entradas|ganho|ganhos|renda)\b/gi, ' ')
    .replace(/\b(pendente|pendentes|atrasado|atrasada|atrasados|pago|pagos|paga|pagas|recebido|recebidos)\b/gi, ' ')
    .replace(/\b(recorrente|recorrentes|parcela|parcelado|parcelas)\b/gi, ' ')
    .replace(/\b(?:acima de|maior que|mais de|abaixo de|menor que|menos de|[<>])\s*[\d.,]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { text, filters };
}

function matchesAmount(value: number, filters: SearchFilters): boolean {
  const abs = Math.abs(value);
  const min = filters.minAmount ? Number(filters.minAmount) : null;
  const max = filters.maxAmount ? Number(filters.maxAmount) : null;
  if (min !== null && Number.isFinite(min) && abs < min) return false;
  if (max !== null && Number.isFinite(max) && abs > max) return false;
  return true;
}

function matchesDate(isoDate: string, filters: SearchFilters): boolean {
  if (!filters.dateFrom && !filters.dateTo) return true;
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return false;
  if (filters.dateFrom) {
    const from = new Date(`${filters.dateFrom}T00:00:00`).getTime();
    if (time < from) return false;
  }
  if (filters.dateTo) {
    const to = new Date(`${filters.dateTo}T23:59:59`).getTime();
    if (time > to) return false;
  }
  return true;
}

export function filterTransactions(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  filters: SearchFilters
): Array<Transaction & { categoryName: string; categoryColor: string; accountName: string }> {
  const parsed = parseSearchQuery(filters.query);
  const merged: SearchFilters = {
    ...filters,
    type: (parsed.filters.type as FinanceTypeFilter) || filters.type,
    status: (parsed.filters.status as FinanceStatusFilter) || filters.status,
    minAmount: parsed.filters.minAmount || filters.minAmount,
    maxAmount: parsed.filters.maxAmount || filters.maxAmount,
    recurringOnly: parsed.filters.recurringOnly || filters.recurringOnly,
  };
  const needle = normalizeText(parsed.text);

  return transactions
    .filter((transaction) => {
      if (merged.type !== 'all' && transaction.type !== merged.type) return false;
      if (merged.status !== 'all' && transaction.status !== merged.status) return false;
      if (merged.categoryId !== 'all' && transaction.categoryId !== merged.categoryId) return false;
      if (merged.accountId !== 'all' && transaction.accountId !== merged.accountId) return false;
      if (merged.recurringOnly && !transaction.groupId) return false;
      if (!matchesAmount(transaction.value, merged)) return false;
      if (!matchesDate(transaction.date, merged)) return false;

      if (!needle) return true;
      const category = categories.find((item) => item.id === transaction.categoryId);
      const account = accounts.find((item) => item.id === transaction.accountId);
      const haystack = normalizeText(
        [
          transaction.description,
          transaction.status,
          transaction.type,
          String(Math.abs(transaction.value)),
          category?.name || '',
          account?.name || '',
        ].join(' ')
      );
      return haystack.includes(needle);
    })
    .map((transaction) => {
      const category = categories.find((item) => item.id === transaction.categoryId);
      const account = accounts.find((item) => item.id === transaction.accountId);
      return {
        ...transaction,
        categoryName: category?.name || 'Sem categoria',
        categoryColor: category?.color || '#A9A9A9',
        accountName: account?.name || 'Conta desconhecida',
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function scoreMatch(haystack: string, needle: string): number {
  if (!needle) return 1;
  const normalized = normalizeText(haystack);
  if (normalized === needle) return 12;
  if (normalized.startsWith(needle)) return 8;
  if (normalized.includes(needle)) return 5;
  return 0;
}

export function searchWorkspace(input: {
  query: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  goals: Goal[];
  limit?: number;
}): SearchHit[] {
  const { text, filters } = parseSearchQuery(input.query);
  const needle = normalizeText(text || input.query);
  const limit = input.limit ?? 20;
  const hits: SearchHit[] = [];

  if (!needle && !input.query.trim()) {
    return PAGE_INDEX.slice(0, 6).map((page) => ({
      id: page.href,
      kind: 'page',
      title: page.title,
      subtitle: page.subtitle,
      href: page.href,
      score: 1,
    }));
  }

  for (const page of PAGE_INDEX) {
    const haystack = [page.title, page.subtitle, ...page.keywords].join(' ');
    const score = scoreMatch(haystack, needle);
    if (score > 0) {
      hits.push({
        id: page.href,
        kind: 'page',
        title: page.title,
        subtitle: page.subtitle,
        href: page.href,
        score: score + 2,
      });
    }
  }

  const filtered = filterTransactions(
    input.transactions,
    input.categories,
    input.accounts,
    {
      ...EMPTY_FILTERS,
      query: input.query,
      type: (filters.type as FinanceTypeFilter) || 'all',
      status: (filters.status as FinanceStatusFilter) || 'all',
      minAmount: filters.minAmount || '',
      maxAmount: filters.maxAmount || '',
      recurringOnly: Boolean(filters.recurringOnly),
      allPeriods: true,
    }
  );

  for (const transaction of filtered.slice(0, 12)) {
    hits.push({
      id: transaction.id,
      kind: 'transaction',
      title: transaction.description,
      subtitle: `${transaction.categoryName} · ${transaction.accountName}`,
      href: `/search?q=${encodeURIComponent(input.query)}&focus=${transaction.id}`,
      score: 6 + scoreMatch(transaction.description, needle),
      transaction,
      amount: transaction.value,
    });
  }

  for (const account of input.accounts) {
    const score = scoreMatch(`${account.name} ${account.type}`, needle);
    if (score > 0) {
      hits.push({
        id: account.id,
        kind: 'account',
        title: account.name,
        subtitle: account.type,
        href: '/accounts',
        score,
      });
    }
  }

  for (const category of input.categories) {
    const score = scoreMatch(`${category.name} ${category.type}`, needle);
    if (score > 0) {
      hits.push({
        id: category.id,
        kind: 'category',
        title: category.name,
        subtitle: category.type === 'income' ? 'Categoria de receita' : 'Categoria de despesa',
        href: '/categories',
        score,
      });
    }
  }

  for (const goal of input.goals) {
    const score = scoreMatch(goal.name, needle);
    if (score > 0) {
      hits.push({
        id: goal.id,
        kind: 'goal',
        title: goal.name,
        subtitle: 'Meta financeira',
        href: '/goals',
        score,
      });
    }
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildInsights(input: {
  income: number;
  expenses: number;
  previousNet?: number;
  categorySpending: Array<{ category: string; total: number }>;
  pendingExpenses: number;
  budget?: number;
  spent?: number;
}): FinanceInsights {
  const expenseAbs = Math.abs(input.expenses);
  const net = input.income - expenseAbs;
  const savingsRate = input.income > 0 ? (net / input.income) * 100 : 0;
  const leading = [...input.categorySpending].sort((a, b) => b.total - a.total)[0] || null;
  const topCategory = leading ? { name: leading.category, total: leading.total } : null;
  const concentration = expenseAbs > 0 && topCategory ? (topCategory.total / expenseAbs) * 100 : 0;
  const monthOverMonth =
    input.previousNet === undefined || input.previousNet === 0
      ? 0
      : ((net - input.previousNet) / Math.abs(input.previousNet)) * 100;

  let healthScore = 55;
  healthScore += Math.max(-25, Math.min(25, savingsRate));
  if (input.pendingExpenses > 0) healthScore -= 12;
  if (input.budget && input.spent && input.spent > input.budget) healthScore -= 15;
  if (concentration > 55) healthScore -= 8;
  healthScore = Math.max(5, Math.min(98, Math.round(healthScore)));

  const alerts: InsightAlert[] = [];
  if (savingsRate >= 20) {
    alerts.push({
      level: 'success',
      title: 'Boa taxa de poupança',
      detail: `${savingsRate.toFixed(1)}% da receita ficou positiva neste período.`,
    });
  } else if (savingsRate < 0) {
    alerts.push({
      level: 'warning',
      title: 'Mês no vermelho',
      detail: 'As despesas superaram as receitas. Revise categorias líderes.',
    });
  }
  if (topCategory && concentration >= 40) {
    alerts.push({
      level: 'info',
      title: `Concentração em ${topCategory.name}`,
      detail: `${concentration.toFixed(0)}% das despesas estão nesta categoria.`,
    });
  }
  if (input.pendingExpenses > 0) {
    alerts.push({
      level: 'warning',
      title: 'Pendências em aberto',
      detail: 'Há lançamentos pendentes ou atrasados que afetam o caixa.',
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      level: 'info',
      title: 'Fluxo estável',
      detail: 'Nenhum alerta crítico no período selecionado.',
    });
  }

  return {
    healthScore,
    savingsRate,
    income: input.income,
    expenses: expenseAbs,
    net,
    topCategory,
    monthOverMonth,
    concentration,
    alerts,
  };
}

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: string;
};

const SAVED_SEARCH_KEY = 'fluxopro-saved-searches';

export function loadSavedSearches(): SavedSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_SEARCH_KEY);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedSearches(items: SavedSearch[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_SEARCH_KEY, JSON.stringify(items.slice(0, 12)));
}
