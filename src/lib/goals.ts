import { z } from 'zod';
import type { Goal } from '@/lib/definitions';

const goalFields = {
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
  targetAmount: z.string().refine(v => !isNaN(parseFloat(v)), { message: 'Valor alvo inválido.' }),
  currentAmount: z.string().refine(v => !isNaN(parseFloat(v)), { message: 'Valor atual inválido.' }),
};

export const goalFormSchema = z.discriminatedUnion('untilCompleted', [
  z.object({
    ...goalFields,
    untilCompleted: z.literal(false),
    targetDate: z.date({ required_error: 'Data alvo é obrigatória.' }),
  }),
  z.object({
    ...goalFields,
    untilCompleted: z.literal(true),
    targetDate: z.date().optional(),
  }),
]);

export type GoalFormValues = z.infer<typeof goalFormSchema>;

export function getGoalFormDefaults(goal?: Goal): GoalFormValues {
  return {
    name: goal?.name || '',
    targetAmount: String(goal?.targetAmount || ''),
    currentAmount: String(goal?.currentAmount || '0'),
    untilCompleted: !!goal && !goal.targetDate,
    targetDate: goal?.targetDate ? new Date(goal.targetDate) : new Date(),
  };
}

export function getGoalFields(data: GoalFormValues): Omit<Goal, 'id' | 'userId'> {
  return {
    name: data.name,
    targetAmount: parseFloat(data.targetAmount.replace(',', '.')),
    currentAmount: parseFloat(data.currentAmount.replace(',', '.')),
    // Explicit null clears a previous deadline when updating with merge: true.
    targetDate: data.untilCompleted ? null : data.targetDate.toISOString(),
  };
}

export function sortGoalsByTargetDate(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    if (!a.targetDate) return b.targetDate ? 1 : 0;
    if (!b.targetDate) return -1;
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
  });
}

export function getGoalProgress(goal: Goal) {
  return {
    progress: goal.targetAmount > 0 ? Math.max(0, Math.min(100, goal.currentAmount / goal.targetAmount * 100)) : 0,
    remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
    isComplete: goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount,
  };
}
