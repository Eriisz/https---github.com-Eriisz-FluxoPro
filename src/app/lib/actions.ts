
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addMonths, format } from "date-fns";
import { checkBudgetAndAlert } from "@/ai/flows/budgeting-alerts";
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { getserverFirestore } from "@/lib/server/firebase";

async function getBudgetForCategory(userId: string, categoryId: string, month: string): Promise<number> {
    const db = getserverFirestore();
    const budgetsCol = collection(db, `users/${userId}/budgets`);
    const q = query(budgetsCol, where("categoryId", "==", categoryId), where("month", "==", month));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data().limit;
    }
    return 0;
}

const transactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória."),
  value: z.number().min(0.01, "Valor deve ser maior que zero."),
  date: z.date(),
  account: z.string().min(1, "Conta é obrigatória."),
  category: z.string().optional(),
  type: z.enum(["income", "expense"]),
  installments: z.number().min(1).max(120).default(1),
});

export type TransactionFormState = {
  message: string;
  errors?: {
    [key: string]: string[] | undefined;
  };
};

// This server action is now only used for budget checking, as writes are handled on the client.
// We keep it in case we need other server-side logic in the future.
export async function addTransaction(
  userId: string,
  prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {

  // The transaction is already added on the client. This action can be used for server-side post-processing.
  // For now, we will just revalidate paths.
  
  revalidatePath("/");
  revalidatePath("/history");
  return { message: `Transação adicionada com sucesso!` };
}

    