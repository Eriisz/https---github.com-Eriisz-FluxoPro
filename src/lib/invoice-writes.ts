import { collection, doc, getDocs, query, runTransaction, where, deleteField, type Firestore } from 'firebase/firestore';
import type { Account, Transaction } from './definitions';
import { dayKey, transactionCycle, invoiceKey } from './cards';

/** Reads every purchase in the transaction: concurrent payments retry and cannot debit twice. */
export async function settleInvoice(db: Firestore, userId: string, cardId: string, invoiceId: string, fundingId: string, today = new Date(), expectedAmount?: number) {
  const purchases = await getDocs(query(collection(db, `users/${userId}/transactions`), where('accountId', '==', cardId)));
  const records = purchases.docs.map(row => row.data() as Transaction);
  return runTransaction(db, async tx => {
    const cardDoc = await tx.get(doc(db, `users/${userId}/accounts`, cardId));
    const fundingDoc = await tx.get(doc(db, `users/${userId}/accounts`, fundingId));
    if (!cardDoc.exists() || !fundingDoc.exists()) throw new Error('Conta não encontrada.');
    const card = { ...cardDoc.data(), id: cardDoc.id } as Account;
    const funding = fundingDoc.data() as Account;
    if (card.type !== 'CartaoCredito' || funding.type === 'CartaoCredito' || cardId === fundingId) throw new Error('Selecione uma conta de origem que não seja cartão.');
    const selected = purchases.docs.filter(row => { const cycle = transactionCycle(row.data() as Transaction, card, records); return cycle && invoiceKey(cardId, cycle) === invoiceId; });
    if (selected.length > 450) throw new Error('Fatura excede o limite de 450 compras para uma operação única.');
    const snapshots = await Promise.all(selected.map(row => tx.get(row.ref)));
    const pending = snapshots.filter(row => {
      if (!row.exists()) return false;
      const data = row.data() as Transaction;
      const cycle = transactionCycle(data, card, records);
      return data.accountId === cardId && data.type === 'expense' && cycle && invoiceKey(cardId, cycle) === invoiceId && ['PENDING', 'LATE'].includes(data.status);
    });
    if (!pending.length) throw new Error('A fatura já foi paga ou não possui compras pendentes.');
    const total = pending.reduce((sum, row) => sum + Math.round(Math.abs((row.data() as Transaction).value) * 100), 0);
    if (expectedAmount !== undefined && Math.round(expectedAmount * 100) !== total) throw new Error('O valor da fatura mudou. Feche a confirmação e revise o valor atualizado.');
    for (const row of pending) {
      const data = row.data() as Transaction;
      const cycle = transactionCycle(data, card, records)!;
      if (dayKey(cycle.invoiceClosingDate) >= dayKey(today)) throw new Error('Aguarde o fechamento da fatura para registrar o pagamento.');
      if (data.paidFromAccountId) throw new Error('Compra já vinculada a um pagamento.');
      tx.update(row.ref, { ...cycle, status: 'PAID', paidFromAccountId: fundingId, paidAt: today.toISOString() });
    }
    return pending.length;
  });
}

export async function reopenInvoice(db: Firestore, userId: string, cardId: string, invoiceId: string) {
  const rows = await getDocs(query(collection(db, `users/${userId}/transactions`), where('accountId', '==', cardId)));
  const selected = rows.docs.filter(row => row.data().paidFromAccountId && invoiceKey(cardId, row.data() as Transaction & { invoiceClosingDate: string; invoiceDueDate: string }) === invoiceId);
  if (selected.length > 450) throw new Error('Fatura excede o limite de uma reversão única.');
  return runTransaction(db, async tx => {
    const snapshots = await Promise.all(selected.map(row => tx.get(row.ref)));
    const paid = snapshots.filter(row => row.exists() && row.data().accountId === cardId && row.data().paidFromAccountId && invoiceKey(cardId, row.data() as Transaction & { invoiceClosingDate: string; invoiceDueDate: string }) === invoiceId);
    if (!paid.length) throw new Error('Não há pagamento vinculado para desfazer.');
    for (const row of paid) tx.update(row.ref, { status: 'PENDING', paidFromAccountId: deleteField(), paidAt: deleteField() });
  });
}
