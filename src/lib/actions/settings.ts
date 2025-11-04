
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { doc, setDoc } from 'firebase/firestore';
import { getserverFirestore } from "@/lib/server/firebase";

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres."),
});

export type ProfileFormState = {
    message: string;
    errors?: { [key: string]: string[] | undefined; };
};

export async function saveProfile(userId: string, prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
    if (!userId) {
        return { message: "Usuário não autenticado.", errors: { auth: ["Usuário não autenticado"] } };
    }

    const rawData = {
        name: formData.get("name"),
    };

    const validatedFields = profileSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            message: "Erro de validação.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const { data } = validatedFields;
    const db = getserverFirestore();
    const userRef = doc(db, `users/${userId}`);

    const profileData = {
        name: data.name,
    };
    
    try {
        await setDoc(userRef, profileData, { merge: true });
    } catch (e: any) {
        return { message: `Erro ao salvar perfil: ${e.message}`, errors: { db: [e.message] } };
    }

    revalidatePath("/settings");
    revalidatePath("/"); // To update sidebar with new name
    
    return { message: "Perfil atualizado com sucesso!" };
}
