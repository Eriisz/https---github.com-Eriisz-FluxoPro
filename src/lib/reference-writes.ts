import { collection, deleteDoc, doc, getDocs, limit, query, where, type Firestore } from 'firebase/firestore';
import { WriteValidationError } from './write-feedback';

type ReferenceCollection = 'accounts' | 'categories';

/** Check current server data before destructive operations on a referenced record. */
export async function assertReferenceUnused(db: Firestore, userId: string, name: ReferenceCollection, id: string) {
  const field = name === 'accounts' ? 'accountId' : 'categoryId';
  const snapshot = await getDocs(query(collection(db, `users/${userId}/transactions`), where(field, '==', id), limit(1)));
  if (!snapshot.empty) throw new WriteValidationError('Existem transações vinculadas. Transfira ou exclua esses lançamentos antes de excluir o registro ou alterar o tipo da categoria.');
}

export async function deleteUnusedReference(db: Firestore, userId: string, name: ReferenceCollection, id: string) {
  await assertReferenceUnused(db, userId, name, id);
  await deleteDoc(doc(db, `users/${userId}/${name}`, id));
}
