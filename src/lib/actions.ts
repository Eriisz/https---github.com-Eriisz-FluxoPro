
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { collection, getDocs, query, where, doc, writeBatch, getDoc } from 'firebase/firestore';
import { getserverFirestore } from "@/lib/server/firebase";
import type { Transaction } from "./definitions";


const updateTransactionsSchema = z.object({
    userId: z.string(),
    transactionId: z.string(),
    groupId: z.string().nullable().optional(),
    scope: z.enum(['current', 'future', 'all']),
    data: z.any(),
});

type UpdateTransactionsInput = z.infer<typeof updateTransactionsSchema>;

export async function updateTransactions(input: UpdateTransactionsInput): Promise<{ success: boolean, error?: string }> {
    const validation = updateTransactionsSchema.safeParse(input);
    if (!validation.success) {
        console.error("Invalid input for updateTransactions:", validation.error);
        return { success: false, error: 'Entrada inválida.' };
    }

    const { userId, transactionId, groupId, scope, data } = validation.data;
    const db = getserverFirestore();
    const batch = writeBatch(db);

    try {
        // If it's a single transaction or only the current one should be updated
        if (scope === 'current' || !groupId) {
            const docRef = doc(db, `users/${userId}/transactions`, transactionId);
            batch.update(docRef, data);
        } else {
            // Logic for 'future' or 'all' scopes
            const originalDocRef = doc(db, `users/${userId}/transactions`, transactionId);
            const originalDocSnap = await getDoc(originalDocRef);

            if (!originalDocSnap.exists()) {
                return { success: false, error: 'Transação original não encontrada.' };
            }
            const originalTransaction = originalDocSnap.data() as Transaction;
            const originalDate = new Date(originalTransaction.date);

            const transactionsCol = collection(db, `users/${userId}/transactions`);
            const q = query(transactionsCol, where('groupId', '==', groupId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Fallback to single update if no group found, which should not happen but is safe
                batch.update(originalDocRef, data);
            } else {
                querySnapshot.forEach(docSnap => {
                    const currentTransaction = docSnap.data() as Transaction;
                    const currentDate = new Date(currentTransaction.date);
                    
                    let shouldUpdate = false;
                    if (scope === 'all') {
                        shouldUpdate = true;
                    } else if (scope === 'future') {
                        // includes the current transaction and all after it
                        shouldUpdate = currentDate.getTime() >= originalDate.getTime();
                    }

                    if (shouldUpdate) {
                        // Apply the new data but preserve the original date and installment info
                        // We must remove the 'installments' field from the update data,
                        // as it's part of the original document structure and should not be changed.
                        const { installments, ...updateData } = data;
                        batch.update(docSnap.ref, updateData);
                    }
                });
            }
        }
        
        await batch.commit();
        
        // Revalidate paths to update UI
        revalidatePath('/');
        revalidatePath('/history');

        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar transações:", error);
        return { success: false, error: 'Ocorreu um erro no servidor ao tentar atualizar as transações.' };
    }
}
