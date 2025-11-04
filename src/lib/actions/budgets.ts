
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { getserverFirestore } from "@/lib/server/firebase";

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Categoria é obrigatória."),
  limit: z.number().min(0.01, "O limite deve ser maior que zero."),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido."),
});

export type BudgetFormState = {
    message: string;
    errors?: { [key: string]: string[] | undefined; };
};

export async function saveBudget(userId: string, budgetId: string | null | undefined, prevState: BudgetFormState, formData: FormData): Promise<BudgetFormState> {
    if (!userId) {
        return { message: "Usuário não autenticado.", errors: { auth: ["Usuário não autenticado"] } };
    }

    const rawData = {
        categoryId: formData.get("categoryId"),
        limit: Number(String(formData.get("limit")).replace(",", ".")),
        month: formData.get("month"),
    };

    const validatedFields = budgetSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            message: "Erro de validação.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const { data } = validatedFields;
    const db = getserverFirestore();
    const id = budgetId || doc(collection(db, '_')).id; // generate id client-side if new
    const budgetRef = doc(db, `users/${userId}/budgets`, id);

    const budgetData = {
        id,
        userId,
        categoryId: data.categoryId,
        limit: data.limit,
        month: data.month,
    };
    
    setDocumentNonBlocking(budgetRef, budgetData, { merge: true });

    revalidatePath("/budgets");
    revalidatePath("/");
    
    return { message: `Orçamento ${budgetId ? 'atualizado' : 'criado'} com sucesso!` };
}

export async function deleteBudget(userId: string, budgetId: string) {
    if (!userId) {
      console.error("User not authenticated");
      return;
    }
    const db = getserverFirestore();
    const budgetRef = doc(db, `users/${userId}/budgets`, budgetId);
    deleteDocumentNonBlocking(budgetRef);
    revalidatePath("/budgets");
    revalidatePath("/");
}
