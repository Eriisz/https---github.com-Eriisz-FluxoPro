
"use server";

import { revalidatePath } from "next/cache";

// Esta função não é mais necessária pois a lógica de atualização foi movida
// para o lado do cliente para um manuseio mais robusto.
// Manter o arquivo para outras possíveis ações de servidor no futuro.

export async function revalidateDashboard() {
    revalidatePath('/');
    revalidatePath('/history');
}
