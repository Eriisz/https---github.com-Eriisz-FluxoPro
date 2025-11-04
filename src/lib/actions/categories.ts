
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getserverFirestore } from "@/lib/server/firebase";

const categorySchema = z.object({
  name: z.string().min(1, "Nome da categoria é obrigatório."),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Formato de cor inválido."),
});

export type CategoryFormState = {
    message: string;
    errors?: { [key: string]: string[] | undefined; };
};

export async function saveCategory(userId: string, categoryId: string | null | undefined, prevState: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
    if (!userId) {
        return { message: "Usuário não autenticado.", errors: { auth: ["Usuário não autenticado"] } };
    }

    const rawData = {
        name: formData.get("name"),
        color: formData.get("color"),
    };

    const validatedFields = categorySchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            message: "Erro de validação.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const { data } = validatedFields;
    const db = getserverFirestore();
    const id = categoryId || doc(collection(db, '_')).id;
    const categoryRef = doc(db, `users/${userId}/categories`, id);

    const categoryData = {
        id,
        userId,
        name: data.name,
        color: data.color,
    };
    
    try {
        await setDoc(categoryRef, categoryData, { merge: true });
    } catch (e: any) {
        return { message: `Erro ao salvar categoria: ${e.message}`, errors: { db: [e.message] } };
    }

    revalidatePath("/categories");
    revalidatePath("/"); // To update charts
    
    return { message: `Categoria ${categoryId ? 'atualizada' : 'criada'} com sucesso!` };
}

export async function deleteCategory(userId: string, categoryId: string) {
    if (!userId) {
      console.error("User not authenticated");
      return;
    }
    const db = getserverFirestore();
    const categoryRef = doc(db, `users/${userId}/categories`, categoryId);
    
    try {
        await deleteDoc(categoryRef);
    } catch (e: any) {
        console.error("Erro ao deletar categoria:", e.message);
        // In a real app, you might want to return an error state.
    }
    
    revalidatePath("/categories");
    revalidatePath("/");
}
