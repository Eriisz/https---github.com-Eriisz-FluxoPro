
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
        if (scope === 'current' || !groupId) {
            const docRef = doc(db, `users/${userId}/transactions`, transactionId);
            batch.update(docRef, data);
        } else {
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
                // Fallback to single update if no group found
                batch.update(originalDocRef, data);
            } else {
                querySnapshot.forEach(docSnap => {
                    const currentTransaction = docSnap.data() as Transaction;
                    const currentDate = new Date(currentTransaction.date);
                    
                    const shouldUpdate = 
                        (scope === 'all') ||
                        (scope === 'future' && currentDate >= originalDate);

                    if (shouldUpdate) {
                        // We keep the date of each installment to avoid shifting them all to the same date
                        const { date, ...restOfData } = data; 
                        batch.update(docSnap.ref, restOfData);
                    }
                });
            }
        }
        
        await batch.commit();
        revalidatePath('/');
        revalidatePath('/history');
        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar transações:", error);
        return { success: false, error: 'Ocorreu um erro no servidor.' };
    }
}
