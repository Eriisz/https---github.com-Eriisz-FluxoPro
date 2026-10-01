export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const source = text.replace(/^\uFEFF/, '');
  if (!source.trim()) return { headers: [], rows: [] };

  const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
  const separators = [',', ';', '\t'];
  let delimiter = ',';
  let highestCount = -1;
  for (const separator of separators) {
    let quoted = false;
    let count = 0;
    for (let index = 0; index < firstLine.length; index += 1) {
      const character = firstLine[index];
      if (character === '"' && firstLine[index + 1] === '"' && quoted) {
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === separator && !quoted) {
        count += 1;
      }
    }
    if (count > highestCount) {
      highestCount = count;
      delimiter = separator;
    }
  }

  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      record.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      record.push(field);
      if (record.some((cell) => cell.trim() !== '')) records.push(record);
      record = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('O arquivo contém uma aspa sem fechamento.');
  record.push(field);
  if (record.some((cell) => cell.trim() !== '')) records.push(record);
  if (records.length < 2) throw new Error('O CSV precisa ter um cabeçalho e ao menos uma linha de dados.');

  const headers = records[0].map((header, index) => header.trim() || `Coluna ${index + 1}`);
  const rows = records.slice(1).map((row) =>
    Array.from({ length: headers.length }, (_, index) => (row[index] ?? '').trim()),
  );

  return { headers, rows };
}

export function normalizeCsvHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseCsvAmount(rawValue: string): number | null {
  let value = rawValue.trim().replace(/[R$\s\u00a0]/g, '').replace(/[−–]/g, '-');
  if (!value) return null;

  const wrappedInParentheses = value.startsWith('(') && value.endsWith(')');
  if (wrappedInParentheses) value = value.slice(1, -1);
  value = value.replace(/[^\d,.-]/g, '');

  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    value = value.split(thousandsSeparator).join('');
    if (decimalSeparator === ',') value = value.replace(',', '.');
  } else if (lastComma >= 0) {
    const decimalPlaces = value.length - lastComma - 1;
    value = decimalPlaces > 0 && decimalPlaces <= 2
      ? value.replace(',', '.')
      : value.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const decimalPlaces = value.length - lastDot - 1;
    if (decimalPlaces === 3 && /^\-?\d{1,3}(?:\.\d{3})+$/.test(value)) {
      value = value.replace(/\./g, '');
    }
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return wrappedInParentheses ? -Math.abs(amount) : amount;
}

export function parseCsvDate(rawValue: string): Date | null {
  const value = rawValue.trim();
  if (!value) return null;

  const brazilianDate = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (brazilianDate) {
    const day = Number(brazilianDate[1]);
    const month = Number(brazilianDate[2]);
    let year = Number(brazilianDate[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day, 12, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const date = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]), 12, 0, 0);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function guessCsvColumn(
  headers: string[],
  patterns: RegExp[],
): number | null {
  const index = headers.findIndex((header) => {
    const normalized = normalizeCsvHeader(header);
    return patterns.some((pattern) => pattern.test(normalized));
  });
  return index < 0 ? null : index;
}

export function normalizeTransactionDescription(value: string): string {
  return normalizeCsvHeader(value).replace(/\s+/g, ' ');
}