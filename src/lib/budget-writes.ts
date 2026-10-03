import { collection, doc, getDocs, query, where, runTransaction, type Firestore } from 'firebase/firestore';
import type { Budget } from './definitions';
export async function saveBudget(db: Firestore, userId: string, data: Pick<Budget, 'month' | 'limit' | 'categoryId'>, existingId?: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.month) || !Number.isFinite(data.limit) || !Number.isSafeInteger(Math.round(data.limit * 100)) || Math.round(data.limit * 100) < 1) throw new Error('Orçamento inválido.');
  const scope = data.categoryId || null;
  const records = collection(db, `users/${userId}/budgets`);
  const existing = await getDocs(query(records, where('month', '==', data.month)));
  if (existing.docs.some(row => row.id !== existingId && (row.data().categoryId || null) === scope)) throw new Error('Já existe um orçamento para este mês e categoria. Edite o registro existente.');
  // A fixed-size key also supports imported category IDs near the backup length limit.
  const scopeKey = scope ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope))))
    .map(byte => byte.toString(16).padStart(2, '0')).join('') : null;
  const id = existingId || `${data.month}_${scopeKey ? `category_${scopeKey}` : 'total'}`;
  const ref = doc(records, id);
  await runTransaction(db, async tx => {
    const current = await tx.get(ref);
    if (!existingId && current.exists()) throw new Error('Orçamento já criado. Atualize a página.');
    if (existingId && (!current.exists() || current.data().month !== data.month || (current.data().categoryId || null) !== scope)) throw new Error('Mês e categoria não podem mudar. Crie outro orçamento.');
    if (scope) {
      const category = await tx.get(doc(db, `users/${userId}/categories`, scope));
      if (!category.exists() || category.data().type !== 'expense') throw new Error('Selecione uma categoria de despesa existente.');
    }
    tx.set(ref, { id, userId, month: data.month, limit: Math.round(data.limit * 100) / 100, categoryId: scope });
  });
}
