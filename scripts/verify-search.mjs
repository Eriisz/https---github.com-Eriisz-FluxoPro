import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function normalizeText(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseSearchQuery(raw) {
  let text = raw.trim();
  const filters = {};
  const normalized = normalizeText(text);
  if (/\b(despesa|despesas|gasto|gastos)\b/.test(normalized)) filters.type = 'expense';
  if (/\b(pendente|pendentes)\b/.test(normalized)) filters.status = 'PENDING';
  const above = normalized.match(/\b(?:acima de|maior que|>)\s*([\d.,]+)/);
  if (above) filters.minAmount = above[1];
  return { text, filters };
}

const parsed = parseSearchQuery('despesas pendentes acima de 200 uber');
if (parsed.filters.type !== 'expense') throw new Error('type parse failed');
if (parsed.filters.status !== 'PENDING') throw new Error('status parse failed');
if (parsed.filters.minAmount !== '200') throw new Error('amount parse failed');
console.log('search parser ok', parsed);
