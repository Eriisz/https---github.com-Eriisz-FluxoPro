import { z } from 'zod';
import { isMoney, parseMoney } from './money';
import type { Goal } from '@/lib/definitions';

const goalFields = {
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
  targetAmount: z.string().refine(v => isMoney(v, 0.01), { message: 'Informe um valor alvo válido maior que zero.' }),
  currentAmount: z.string().refine(v => isMoney(v), { message: 'Informe um valor acumulado válido, igual ou maior que zero.' }),
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
    targetAmount: parseMoney(data.targetAmount)!,
    currentAmount: parseMoney(data.currentAmount)!,
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

export function contributionTotal(current: number, target: number, amount: number): number {
  const cents = [current, target, amount].map(value => Math.round(value * 100));
  if (!cents.every(Number.isSafeInteger) || cents[0] < 0 || cents[1] <= 0 || cents[2] <= 0) throw new Error('Valor do aporte inválido.');
  if (cents[0] + cents[2] > cents[1]) throw new Error('O aporte excede o valor restante da meta.');
  return (cents[0] + cents[2]) / 100;
}
