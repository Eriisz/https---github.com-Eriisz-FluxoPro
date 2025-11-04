// budgeting-alerts.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for alerting users when a transaction
 * causes them to exceed their budget for a specific category.
 *
 * - checkBudgetAndAlert - Checks if a transaction exceeds the budget and triggers an alert.
 * - CheckBudgetAndAlertInput - The input type for the checkBudgetAndAlert function.
 * - CheckBudgetAndAlertOutput - The return type for the checkBudgetAndAlert function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the flow
const CheckBudgetAndAlertInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  transactionValue: z.number().describe('The value of the transaction.'),
  transactionCategory: z.string().describe('The category of the transaction.'),
  budgetValue: z.number().describe('The budget value for this category.'),
});
export type CheckBudgetAndAlertInput = z.infer<typeof CheckBudgetAndAlertInputSchema>;

// Define the output schema for the flow
const CheckBudgetAndAlertOutputSchema = z.object({
  shouldAlert: z.boolean().describe('Whether an alert should be triggered.'),
  alertMessage: z.string().optional().describe('The message to display in the alert.'),
});
export type CheckBudgetAndAlertOutput = z.infer<typeof CheckBudgetAndAlertOutputSchema>;

// Define the tool to check if the budget has been exceeded
const checkBudgetExceeded = ai.defineTool({
  name: 'checkBudgetExceeded',
  description: 'Checks if a transaction causes the user to exceed their budget for a category.',
  inputSchema: z.object({
    transactionValue: z.number().describe('The value of the transaction.'),
    budgetValue: z.number().describe('The budget value for this category.'),
  }),
  outputSchema: z.boolean(),
}, async (input) => {
  return input.transactionValue > input.budgetValue;
});

// Define the prompt for generating the alert message
const generateAlertMessagePrompt = ai.definePrompt({
  name: 'generateAlertMessagePrompt',
  input: { schema: CheckBudgetAndAlertInputSchema },
  prompt: `You are a personal finance assistant. A user has made a transaction of value {{transactionValue}} in the category {{transactionCategory}}. The budget for this category is {{budgetValue}}. Determine if user exceeded the budget, and return the appropriate message. Be concise and to the point.`,
});

// Define the Genkit flow
const checkBudgetAndAlertFlow = ai.defineFlow({
  name: 'checkBudgetAndAlertFlow',
  inputSchema: CheckBudgetAndAlertInputSchema,
  outputSchema: CheckBudgetAndAlertOutputSchema,
}, async (input) => {
  const budgetExceeded = await checkBudgetExceeded({
    transactionValue: input.transactionValue,
    budgetValue: input.budgetValue,
  });

  if (budgetExceeded) {
    const alertResponse = await generateAlertMessagePrompt(input);
    return {
      shouldAlert: true,
      alertMessage: alertResponse.output?.text,
    };
  } else {
    return {
      shouldAlert: false,
    };
  }
});

/**
 * Checks if a transaction exceeds the budget and triggers an alert.
 * @param input - The input for the budget check and alert.
 * @returns A promise that resolves to the output of the flow.
 */
export async function checkBudgetAndAlert(input: CheckBudgetAndAlertInput): Promise<CheckBudgetAndAlertOutput> {
  return checkBudgetAndAlertFlow(input);
}
