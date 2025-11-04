
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { getSdks } from "@/firebase";
import { initializeApp, getApps, getApp } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";

// Function to get the Firestore instance on the server
function getserverFirestore() {
    const apps = getApps();
    const app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
    const { firestore } = getSdks(app);
    return firestore;
}

const accountSchema = z.object({
  name: z.string().min(1, "Nome da conta é obrigatório."),
  type: z.enum(['ContaCorrente', 'CartaoCredito', 'Investimento', 'Outro']),
  initialBalance: z.number().default(0),
  limit: z.number().optional(),
});

export type AccountFormState = {
    message: string;
    errors?: { [key: string]: string[] | undefined; };
};

export async function saveAccount(userId: string, accountId: string | null | undefined, prevState: AccountFormState, formData: FormData): Promise<AccountFormState> {
    if (!userId) {
        return { message: "Usuário não autenticado.", errors: { auth: ["Usuário não autenticado"] } };
    }

    const rawData = {
        name: formData.get("name"),
        type: formData.get("type"),
        initialBalance: Number(String(formData.get("initialBalance")).replace(",", ".")) || 0,
        limit: formData.get("limit") ? Number(String(formData.get("limit")).replace(",", ".")) : undefined,
    };

    const validatedFields = accountSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            message: "Erro de validação.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const { data } = validatedFields;
    const db = getserverFirestore();
    const id = accountId || doc(collection(db, '_')).id; // generate id client-side if new
    const accountRef = doc(db, `users/${userId}/accounts`, id);

    const accountData = {
        id,
        userId,
        name: data.name,
        type: data.type,
        ...(accountId ? {} : { balance: data.initialBalance }), // Only set initial balance on create
        ...(data.type === 'CartaoCredito' && data.limit ? { limit: data.limit } : {}),
    };
    
    setDocumentNonBlocking(accountRef, accountData, { merge: true });

    revalidatePath("/accounts");
    revalidatePath("/");
    
    return { message: `Conta ${accountId ? 'atualizada' : 'criada'} com sucesso!` };
}

export async function deleteAccount(userId: string, accountId: string) {
    if (!userId) {
      console.error("User not authenticated");
      return;
    }
    const db = getserverFirestore();
    const accountRef = doc(db, `users/${userId}/accounts`, accountId);
    deleteDocumentNonBlocking(accountRef);
    revalidatePath("/accounts");
    revalidatePath("/");
}
