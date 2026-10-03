import { collection, doc, getDocs, query, where, runTransaction, type Firestore, type DocumentReference } from 'firebase/firestore';
import type { Account, Transaction } from './definitions';
import { transactionChanges, editableStatus, type TransactionFormValues } from './transactions';
import { prepareCardTransaction } from './cards';

async function originalRefs(db: Firestore, userId: string, original?: Transaction, group = true) {
  const records = collection(db, `users/${userId}/transactions`);
  return original?.groupId && group
    ? (await getDocs(query(records, where('groupId', '==', original.groupId)))).docs.map(item => item.ref)
    : original ? [doc(records, original.id)] : [];
}
function assertEditable(row: Transaction) {
  if (row.paidFromAccountId) throw new Error('Desfaça o pagamento da fatura antes de editar ou excluir suas compras.');
}
export async function deleteTransactions(db: Firestore, userId: string, transaction: Transaction, entireGroup: boolean) {
  const refs = await originalRefs(db, userId, transaction, entireGroup);
  if (refs.length > 450) throw new Error('Grupo excede o limite de uma exclusão atômica.');
  await runTransaction(db, async tx => {
    const rows = await Promise.all(refs.map(ref => tx.get(ref)));
    rows.forEach(row => { if (row.exists()) assertEditable(row.data() as Transaction); });
    rows.forEach(row => { if (row.exists()) tx.delete(row.ref); });
  });
}
/** Reads protect against payment races; all replacements commit atomically. */
export async function replaceTransactions(db: Firestore, userId: string, replacements: Transaction[], original?: Transaction) {
  const records = collection(db, `users/${userId}/transactions`);
  const previous = await originalRefs(db, userId, original);
  if (previous.length + replacements.length > 450) throw new Error('O grupo é grande demais para uma alteração única e segura.');
  await runTransaction(db, async tx => {
    const rows = await Promise.all(previous.map(ref => tx.get(ref)));
    rows.forEach(row => { if (row.exists()) assertEditable(row.data() as Transaction); });
    rows.forEach(row => { if (row.exists()) tx.delete(row.ref); });
    replacements.forEach(row => tx.set(doc(records, row.id), row));
  });
}
export async function updateTransactions(db: Firestore, userId: string, original: Transaction, data: TransactionFormValues, accounts: Account[]) {
  const refs = await originalRefs(db, userId, original, data.updateScope !== 'current');
  if (refs.length > 450) throw new Error('Grupo excede o limite de uma atualização atômica.');
  await runTransaction(db, async tx => {
    const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
    const seriesStart = snapshots.filter(row => row.exists()).map(row => row.data() as Transaction).find(row => row.installments?.current === 1)?.date;
    const updates: Array<{ ref: DocumentReference; data: Transaction }> = [];
    for (const snapshot of snapshots) {
      if (!snapshot.exists()) continue;
      const row = snapshot.data() as Transaction;
      if (data.updateScope === 'future' && new Date(row.date) < new Date(original.date)) continue;
      assertEditable(row);
      let next = { ...row, ...transactionChanges(data, original, row), ...(data.updateScope === 'current' || !original.groupId ? { date: data.date.toISOString() } : {}) };
      const account = accounts.find(item => item.id === next.accountId);
      if (!account) throw new Error('Conta não encontrada.');
      if (account.type === 'CartaoCredito' && data.status === 'PAID' && data.status !== editableStatus(original)) throw new Error('Registre o pagamento pela tela de faturas.');
      if (row.accountId !== next.accountId || row.date !== next.date || (account.type === 'CartaoCredito' && !row.invoiceMonth)) {
        const prepared = prepareCardTransaction(next, account, data.updateScope !== 'current' ? seriesStart : undefined);
        next = row.accountId === next.accountId && row.status === 'PAID' ? { ...prepared, status: 'PAID' } : prepared;
      }
      if (account.type === 'CartaoCredito' && next.type !== 'expense') throw new Error('Cartões recebem somente compras.');
      updates.push({ ref: snapshot.ref, data: next });
    }
    if (!updates.length) throw new Error('Lançamento não encontrado. Atualize a página.');
    updates.forEach(item => tx.set(item.ref, item.data));
  });
}
