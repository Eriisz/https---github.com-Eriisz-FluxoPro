import { collection, deleteDoc, doc, getDocs, query, where, writeBatch, type Firestore } from 'firebase/firestore';
import type { Transaction } from './definitions';

export async function deleteTransactions(db: Firestore, userId: string, transaction: Transaction, entireGroup: boolean) {
  const transactions = collection(db, `users/${userId}/transactions`);
  if (!entireGroup || !transaction.groupId) return deleteDoc(doc(transactions, transaction.id));
  const snapshot = await getDocs(query(transactions, where('groupId', '==', transaction.groupId)));
  if (snapshot.size > 500) throw new Error('Grupo excede o limite de uma exclusão atômica.');
  const batch = writeBatch(db);
  snapshot.forEach(item => batch.delete(item.ref));
  await batch.commit();
}

/** One batch prevents loss of the original group when creating replacements fails. */
export async function replaceTransactions(db: Firestore, userId: string, replacements: Transaction[], original?: Transaction) {
  const transactions = collection(db, `users/${userId}/transactions`);
  const previous = original?.groupId
    ? (await getDocs(query(transactions, where('groupId', '==', original.groupId)))).docs.map(item => item.ref)
    : original ? [doc(transactions, original.id)] : [];
  if (previous.length + replacements.length > 500) throw new Error('O grupo é grande demais para uma alteração única e segura.');
  const batch = writeBatch(db);
  previous.forEach(ref => batch.delete(ref));
  replacements.forEach(item => batch.set(doc(transactions, item.id), item));
  await batch.commit();
}
