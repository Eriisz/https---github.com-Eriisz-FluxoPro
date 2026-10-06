'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { prepareCardTransaction } from '@/lib/cards';
import { Check, FileUp, Loader, Upload } from 'lucide-react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { useFirestore, useUser } from '@/firebase';
import { useData } from '@/context/DataContext';
import { useToast } from '@/hooks/use-toast';
import type { Category, Transaction } from '@/lib/definitions';
import { formatCurrency } from '@/lib/utils';
import {
  guessCsvColumn,
  normalizeTransactionDescription,
  parseCsv,
  parseCsvAmount,
  parseCsvDate,
  type ParsedCsv,
} from '@/lib/csv-import';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MAX_IMPORT_ROWS = 450;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type ColumnMapping = {
  date: number | null;
  description: number | null;
  amount: number | null;
  debit: number | null;
  credit: number | null;
};

type PreviewRow = {
  rowNumber: number;
  date: Date;
  description: string;
  value: number;
  duplicateDescription: string | null;
};

function isPossibleDuplicate(
  date: Date,
  description: string,
  value: number,
  candidate: Pick<Transaction, 'description' | 'value'> & { date: string | Date },
) {
  const candidateDate = candidate.date instanceof Date ? candidate.date : new Date(candidate.date);
  if (Number.isNaN(candidateDate.getTime())) return false;
  if (Math.abs(Math.abs(value) - Math.abs(candidate.value)) > 0.01) return false;
  if (Math.abs(date.getTime() - candidateDate.getTime()) > 2 * 24 * 60 * 60 * 1000) return false;

  const incomingDescription = normalizeTransactionDescription(description);
  const existingDescription = normalizeTransactionDescription(candidate.description);
  if (!incomingDescription || !existingDescription) return false;
  if (incomingDescription.includes(existingDescription) || existingDescription.includes(incomingDescription)) return true;

  const incomingWords = new Set(incomingDescription.split(' '));
  const existingWords = new Set(existingDescription.split(' '));
  const sharedWords = [...incomingWords].filter((word) => word.length > 2 && existingWords.has(word));
  return sharedWords.length > 0 && sharedWords.length / Math.max(incomingWords.size, existingWords.size) >= 0.4;
}

function ColumnSelect({
  label,
  headers,
  value,
  required = false,
  onChange,
}: {
  label: string;
  headers: string[];
  value: number | null;
  required?: boolean;
  onChange: (value: number | null) => void;
}) {
  const id = `csv-column-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}{required ? ' *' : ''}</Label>
      <select
        id={id}
        value={value === null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {!required && <option value="">Não usar</option>}
        {headers.map((header, index) => (
          <option key={`${header}-${index}`} value={index}>
            {header} (coluna {index + 1})
          </option>
        ))}
      </select>
    </div>
  );
}

export function CsvReconciliation() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { accounts, categories, allTransactions } = useData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsedFile, setParsedFile] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: null,
    description: null,
    amount: null,
    debit: null,
    credit: null,
  });
  const [accountId, setAccountId] = useState('');
  const [incomeCategoryId, setIncomeCategoryId] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [selectionOverrides, setSelectionOverrides] = useState<Record<number, boolean>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!accountId && accounts?.length) setAccountId(accounts[0].id);
  }, [accountId, accounts]);

  useEffect(() => {
    if (!categories?.length) return;
    if (!incomeCategoryId) {
      setIncomeCategoryId(categories.find((category) => category.type === 'income')?.id ?? '');
    }
    if (!expenseCategoryId) {
      setExpenseCategoryId(categories.find((category) => category.type === 'expense')?.id ?? '');
    }
  }, [categories, expenseCategoryId, incomeCategoryId]);

  const previewRows = useMemo<PreviewRow[]>(() => {
    if (!parsedFile || mapping.date === null || mapping.description === null) return [];

    const rawRows = parsedFile.rows;
    const transactions = allTransactions ?? [];
    const accountTransactions = transactions.filter((transaction) => transaction.accountId === accountId);
    const mapped: Omit<PreviewRow, 'duplicateDescription'>[] = [];

    rawRows.forEach((row, rowIndex) => {
      const date = parseCsvDate(row[mapping.date!] ?? '');
      const description = (row[mapping.description!] ?? '').trim();
      if (!date || !description) return;

      const signedAmount = mapping.amount === null ? null : parseCsvAmount(row[mapping.amount] ?? '');
      const debitAmount = mapping.debit === null ? null : parseCsvAmount(row[mapping.debit] ?? '');
      const creditAmount = mapping.credit === null ? null : parseCsvAmount(row[mapping.credit] ?? '');
      const value = signedAmount !== null
        ? signedAmount
        : debitAmount !== null || creditAmount !== null
          ? Math.abs(creditAmount ?? 0) - Math.abs(debitAmount ?? 0)
          : null;

      if (value === null || Math.abs(value) < 0.005) return;
      mapped.push({ rowNumber: rowIndex + 2, date, description, value });
    });

    return mapped.map((row, index) => {
      const existing = accountTransactions.find((transaction) =>
        isPossibleDuplicate(row.date, row.description, row.value, transaction),
      );
      const earlierInFile = mapped.slice(0, index).find((candidate) =>
        isPossibleDuplicate(row.date, row.description, row.value, candidate),
      );
      return {
        ...row,
        duplicateDescription: existing?.description ?? earlierInFile?.description ?? null,
      };
    });
  }, [accountId, allTransactions, mapping, parsedFile]);

  const selectedRows = previewRows.filter((row) =>
    selectionOverrides[row.rowNumber] ?? !row.duplicateDescription,
  );
  const invalidRowCount = parsedFile ? parsedFile.rows.length - previewRows.length : 0;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    setSelectionOverrides({});

    if (file.size > MAX_FILE_SIZE) {
      setParsedFile(null);
      setErrorMessage('O arquivo precisa ter no máximo 5 MB.');
      return;
    }

    try {
      const csv = parseCsv(await file.text());
      const dateColumn = guessCsvColumn(csv.headers, [
        /^data$/, /data lancamento/, /data transacao/, /^date$/, /posted date/, /transaction date/,
      ]);
      const descriptionColumn = guessCsvColumn(csv.headers, [
        /descricao/, /historico/, /description/, /memo/, /merchant/, /detalhe/,
      ]);
      const amountColumn = guessCsvColumn(csv.headers, [
        /^valor$/, /valor movimentacao/, /^amount$/, /^value$/, /quantia/, /montante/,
      ]);
      const debitColumn = guessCsvColumn(csv.headers, [/debito/, /^debit$/, /saida/, /retirada/, /withdraw/, /pagamento/]);
      const creditColumn = guessCsvColumn(csv.headers, [/credito/, /^credit$/, /entrada/, /deposito/, /deposit/]);

      setParsedFile(csv);
      setMapping({
        date: dateColumn,
        description: descriptionColumn,
        amount: amountColumn,
        debit: debitColumn,
        credit: creditColumn,
      });
      setFileName(file.name);
      if (csv.rows.length > MAX_IMPORT_ROWS) {
        setErrorMessage(`O CSV tem ${csv.rows.length} linhas. Divida o arquivo em partes de até ${MAX_IMPORT_ROWS} linhas para importar com segurança.`);
      }
    } catch (error) {
      setParsedFile(null);
      setFileName('');
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível ler esse CSV.');
    } finally {
      event.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!user || !parsedFile || !accountId || selectedRows.length === 0) return;
    if (parsedFile.rows.length > MAX_IMPORT_ROWS) return;
    if (mapping.date === null || mapping.description === null) {
      setErrorMessage('Selecione as colunas de data e descrição para continuar.');
      return;
    }
    if (mapping.amount === null && mapping.debit === null && mapping.credit === null) {
      setErrorMessage('Selecione uma coluna de valor, débito ou crédito.');
      return;
    }

    setIsImporting(true);
    setErrorMessage('');
    try {
      const transactionsCollection = collection(firestore, `users/${user.uid}/transactions`);
      const batch = writeBatch(firestore);

      const account = accounts?.find(item => item.id === accountId);
      if (!account) throw new Error('Conta não encontrada.');
      selectedRows.forEach((row) => {
        const isIncome = row.value > 0;
        const transactionRef = doc(transactionsCollection);
        const transaction: Transaction = {
          id: transactionRef.id,
          userId: user.uid,
          description: row.description,
          value: row.value,
          date: row.date.toISOString(),
          accountId,
          categoryId: (isIncome ? incomeCategoryId : expenseCategoryId) || '',
          type: isIncome ? 'income' : 'expense',
          status: isIncome ? 'RECEIVED' : 'PAID',
        };
        batch.set(transactionRef, prepareCardTransaction(transaction, account));
      });

      await batch.commit();
      toast({
        title: 'Importação concluída',
        description: `${selectedRows.length} transação(ões) adicionada(s). As possíveis duplicatas não selecionadas foram ignoradas.`,
      });
      setParsedFile(null);
      setFileName('');
      setSelectionOverrides({});
      setMapping({ date: null, description: null, amount: null, debit: null, credit: null });
    } catch (error) {
      console.error('CSV import failed:', error);
      toast({
        variant: 'destructive',
        title: 'Falha na importação',
        description: 'Nenhuma transação foi confirmada. Verifique sua conexão e tente novamente.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const categoriesFor = (type: Category['type']) => (categories ?? []).filter((category) => category.type === type);

  return (
    <Card className="luxury-card">
      <CardHeader>
        <CardTitle>Importar e reconciliar CSV</CardTitle>
        <CardDescription>
          Adicione um extrato bancário sem substituir seus dados. Datas, descrições e valores são revisados antes da gravação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="bank-csv">Arquivo do banco</Label>
            <Input
              id="bank-csv"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              aria-describedby="csv-file-help"
            />
            <p id="csv-file-help" className="text-xs text-muted-foreground">
              CSV até 5 MB; créditos positivos e débitos negativos ou colunas de débito/crédito separadas.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="csv-account">Conta de destino</Label>
            <select
              id="csv-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              disabled={!accounts?.length}
            >
              {(accounts ?? []).map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            {!accounts?.length && <p className="text-xs text-destructive">Cadastre uma conta antes de importar transações.</p>}
          </div>
        </div>

        {parsedFile && (
          <div className="space-y-5 rounded-lg border bg-background/50 p-4">
            <div className="flex items-start gap-3">
              <FileUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  Mapeie as colunas e revise as {previewRows.length} linhas válidas antes de importar.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <ColumnSelect
                label="Data"
                headers={parsedFile.headers}
                value={mapping.date}
                required
                onChange={(date) => setMapping((current) => ({ ...current, date }))}
              />
              <ColumnSelect
                label="Descrição"
                headers={parsedFile.headers}
                value={mapping.description}
                required
                onChange={(description) => setMapping((current) => ({ ...current, description }))}
              />
              <ColumnSelect
                label="Valor assinado"
                headers={parsedFile.headers}
                value={mapping.amount}
                onChange={(amount) => setMapping((current) => ({ ...current, amount }))}
              />
              <ColumnSelect
                label="Débito (opcional)"
                headers={parsedFile.headers}
                value={mapping.debit}
                onChange={(debit) => setMapping((current) => ({ ...current, debit }))}
              />
              <ColumnSelect
                label="Crédito (opcional)"
                headers={parsedFile.headers}
                value={mapping.credit}
                onChange={(credit) => setMapping((current) => ({ ...current, credit }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="csv-income-category">Categoria para entradas</Label>
                <select
                  id="csv-income-category"
                  value={incomeCategoryId}
                  onChange={(event) => setIncomeCategoryId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sem categoria</option>
                  {categoriesFor('income').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="csv-expense-category">Categoria para saídas</Label>
                <select
                  id="csv-expense-category"
                  value={expenseCategoryId}
                  onChange={(event) => setExpenseCategoryId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sem categoria</option>
                  {categoriesFor('expense').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
            </div>

            <div className="max-h-[420px] overflow-auto rounded-md border">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="sticky top-0 bg-muted text-muted-foreground">
                  <tr>
                    <th className="w-12 p-3">Importar</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3">Conferência</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => {
                    const selected = selectionOverrides[row.rowNumber] ?? !row.duplicateDescription;
                    return (
                      <tr key={row.rowNumber} className="border-t">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => setSelectionOverrides((current) => ({
                              ...current,
                              [row.rowNumber]: event.target.checked,
                            }))}
                            aria-label={`Importar ${row.description}`}
                          />
                        </td>
                        <td className="whitespace-nowrap p-3">{format(row.date, 'dd/MM/yyyy')}</td>
                        <td className="max-w-[280px] truncate p-3" title={row.description}>{row.description}</td>
                        <td className={`whitespace-nowrap p-3 text-right font-medium ${row.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                          {formatCurrency(row.value)}
                        </td>
                        <td className="p-3">
                          {row.duplicateDescription ? (
                            <span className="text-amber-700 dark:text-amber-400" title={`Registro parecido: ${row.duplicateDescription}`}>
                              Possível duplicata
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Nova
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {previewRows.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Ajuste as colunas para exibir as transações do arquivo.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {invalidRowCount > 0 && <span>{invalidRowCount} linha(s) ignorada(s) por data ou valor inválido. </span>}
                {previewRows.length - selectedRows.length} possível(is) duplicata(s) ignorada(s); você pode selecioná-la(s) manualmente.
              </div>
              <Button
                onClick={handleImport}
                disabled={
                  isImporting ||
                  !user ||
                  !accountId ||
                  selectedRows.length === 0 ||
                  parsedFile.rows.length > MAX_IMPORT_ROWS
                }
              >
                {isImporting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isImporting ? 'Importando...' : `Adicionar ${selectedRows.length} transação(ões)`}
              </Button>
            </div>
          </div>
        )}

        {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      </CardContent>
    </Card>
  );
}