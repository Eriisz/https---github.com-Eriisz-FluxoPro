
"use server";

import { revalidatePath } from "next/cache";

/**
 * Revalidates the cache for the dashboard and history pages.
 * This is useful after any data modification to ensure the UI reflects the latest changes.
 */
export async function revalidateDashboard() {
    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath('/accounts');
    revalidatePath('/categories');
    revalidatePath('/budgets');
    revalidatePath('/goals');
}

