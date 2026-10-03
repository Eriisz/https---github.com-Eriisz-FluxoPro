/** Parse BRL input strictly, accepting 1.234,56 and ungrouped 1234.56. */
export function parseMoney(input: string): number | null {
  let value = input.trim().replace(/^R\$\s*/, '');
  if (/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(value)) {
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, '');
  } else if (!/^[+-]?\d+(?:\.\d{1,2})?$/.test(value)) {
    return null;
  }
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  return Number.isFinite(amount) && Number.isSafeInteger(cents) ? cents / 100 : null;
}

export function isMoney(input: string, minimum = 0): boolean {
  const value = parseMoney(input);
  return value !== null && value >= minimum;
}

export function splitInstallments(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || !Number.isInteger(count) || count < 1 || count > 120 || cents < count) {
    throw new Error('Use de 1 a 120 parcelas, com ao menos R$ 0,01 por parcela.');
  }
  const base = Math.floor(cents / count);
  const remainder = cents % count;
  return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}
