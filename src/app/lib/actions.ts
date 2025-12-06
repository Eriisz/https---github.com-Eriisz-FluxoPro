
"use server";

import { revalidatePath } from "next/cache";

export type TransactionFormState = {
  message: string;
  errors?: {
    [key: string]: string[] | undefined;
  };
};

// This server action is now only used for cache revalidation post-write, 
// as writes are handled optimistically on the client.
export async function addTransaction(
  userId: string,
  prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {

  // The transaction is already added on the client. This action is used for server-side post-processing.
  // For now, we will just revalidate paths.
  
  revalidatePath("/");
  revalidatePath("/history");
  return { message: `Cache revalidado.` };
}
