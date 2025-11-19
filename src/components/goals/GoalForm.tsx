'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Goal } from '@/lib/definitions';
import { doc, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
  targetAmount: z.string().refine(v => !isNaN(parseFloat(v)), { message: 'Valor alvo inválido.'}),
  currentAmount: z.string().refine(v => !isNaN(parseFloat(v)), { message: 'Valor atual inválido.'}),
});

type FormValues = z.infer<typeof formSchema>;

interface GoalFormProps {
  existingGoal?: Goal;
  onFormSubmit: () => void;
}

export function GoalForm({ existingGoal, onFormSubmit }: GoalFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!existingGoal;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingGoal?.name || '',
      targetAmount: String(existingGoal?.targetAmount || ''),
      currentAmount: String(existingGoal?.currentAmount || '0'),
    },
  });

  async function onSubmit(data: FormValues) {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }

    const id = existingGoal?.id || doc(collection(firestore, '_')).id;
    const goalRef = doc(firestore, `users/${user.uid}/goals`, id);

    const goalData = {
      id,
      userId: user.uid,
      name: data.name,
      targetAmount: parseFloat(data.targetAmount.replace(',', '.')),
      currentAmount: parseFloat(data.currentAmount.replace(',', '.')),
    };

    setDocumentNonBlocking(goalRef, goalData, { merge: true });
    
    toast({
        title: 'Sucesso!',
        description: `Meta ${isEditing ? 'atualizada' : 'criada'} com sucesso!`,
    });

    onFormSubmit();
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Meta</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Viagem para a Europa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="targetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Alvo (R$)</FormLabel>
              <FormControl>
                <Input type="text" placeholder="15000,00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currentAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Inicial (R$)</FormLabel>
              <FormControl>
                <Input type="text" placeholder="0,00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Meta'}
        </Button>
      </form>
    </Form>
  );
}
