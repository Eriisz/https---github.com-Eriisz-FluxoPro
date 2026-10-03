import { doc, runTransaction, type Firestore } from 'firebase/firestore';
import { contributionTotal } from './goals';
import type { Goal } from './definitions';

export async function contributeToGoal(db: Firestore, userId: string, goalId: string, value: number) {
  const ref = doc(db, `users/${userId}/goals`, goalId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Esta meta não existe mais.');
    const latest = snapshot.data() as Goal;
    const currentAmount = contributionTotal(latest.currentAmount, latest.targetAmount, value);
    transaction.update(ref, { currentAmount });
  });
}
