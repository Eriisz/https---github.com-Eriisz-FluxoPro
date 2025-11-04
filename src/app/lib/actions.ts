"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addMonths } from "date-fns";
import { checkBudgetAndAlert } from "@/ai/flows/budgeting-alerts";

// Simulação de banco de dados e funções. Em uma app real, use o Firestore.
const MOCK_BUDGETS = {
  "Alimentação": 800,
  "Transporte": 300,
  "Lazer": 400,
};

async function getBudgetForCategory(category: string): Promise<number> {
    // @ts-ignore
    return MOCK_BUDGETS[category] || 0;
}

const transactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória."),
  value: z.number().min(0.01, "Valor deve ser maior que zero."),
  date: z.date(),
  account: z.string().min(1, "Conta é obrigatória."),
  category: z.string().min(1, "Categoria é obrigatória."),
  type: z.enum(["income", "expense"]),
  installments: z.number().min(1).max(120).default(1),
});

export type TransactionFormState = {
  message: string;
  errors?: {
    [key: string]: string[] | undefined;
  };
};

export async function addTransaction(
  userId: string,
  prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const rawData = {
    description: formData.get("description"),
    value: Number(String(formData.get("value")).replace(",", ".")),
    date: new Date(formData.get("date") as string),
    account: formData.get("account"),
    category: formData.get("category"),
    type: formData.get("type"),
    installments: Number(formData.get("installments") || 1),
  };
  
  const validatedFields = transactionSchema.safeParse(rawData);
  
  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    return {
      message: "Erro de validação. Verifique os campos.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { data } = validatedFields;
  const groupId = data.installments > 1 ? crypto.randomUUID() : undefined;

  for (let i = 0; i < data.installments; i++) {
    const transactionDate = addMonths(data.date, i);
    const transactionValue = data.type === 'expense' ? -data.value : data.value;

    const newTransaction = {
      id: crypto.randomUUID(),
      userId,
      ...data,
      date: transactionDate.toISOString(),
      value: transactionValue,
      groupId,
      installments: data.installments > 1 ? { current: i + 1, total: data.installments } : undefined,
    };

    // Aqui você salvaria a 'newTransaction' no Firestore
    console.log("Salvando transação:", newTransaction);
  }
  
  // Verifica o orçamento para despesas
  if (data.type === 'expense') {
      const budgetValue = await getBudgetForCategory(data.category);
      if (budgetValue > 0) {
          const result = await checkBudgetAndAlert({
              userId,
              transactionValue: data.value,
              transactionCategory: data.category,
              budgetValue,
          });

          if (result.shouldAlert) {
            // Em uma aplicação real, você poderia enviar um e-mail ou notificação push.
            // Por agora, retornamos a mensagem de alerta.
            console.warn("ALERTA DE ORÇAMENTO:", result.alertMessage);
            revalidatePath("/");
            return { message: `Transação adicionada. ${result.alertMessage}` };
          }
      }
  }

  revalidatePath("/");
  return { message: `Transação ${data.installments > 1 ? 'parcelada ' : ''}adicionada com sucesso!` };
}
