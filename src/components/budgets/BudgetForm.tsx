
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calculator as CalculatorIcon } from 'lucide-react';

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
import type { Budget } from '@/lib/definitions';
import { doc, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calculator } from '../shared/Calculator';
import { revalidateDashboard } from '@/lib/actions';

const formSchema = z.object({
  limit: z.string().min(1, 'Limite é obrigatório.'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Mês deve estar no formato AAAA-MM.'),
});

type FormValues = z.infer<typeof formSchema>;

interface BudgetFormProps {
  existingBudget?: Budget;
  onFormSubmit: () => void;
}

export function BudgetForm({ existingBudget, onFormSubmit }: BudgetFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!existingBudget;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      limit: String(existingBudget?.limit || ''),
      month: existingBudget?.month || format(new Date(), 'yyyy-MM'),
    },
  });

  async function onSubmit(data: FormValues) {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }

    const id = existingBudget?.id || doc(collection(firestore, '_')).id;
    const budgetRef = doc(firestore, `users/${user.uid}/budgets`, id);

    const budgetData = {
      id,
      userId: user.uid,
      limit: parseFloat(data.limit.replace(',', '.')),
      month: data.month,
    };

    setDocumentNonBlocking(budgetRef, budgetData, { merge: true });
    await revalidateDashboard();
    
    toast({
        title: 'Sucesso!',
        description: `Orçamento ${isEditing ? 'atualizado' : 'criado'} com sucesso!`,
    });

    onFormSubmit();
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
            control={form.control}
            name="month"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Mês</FormLabel>
                    <FormControl>
                        <Input type="month" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite de Gasto Total (R$)</FormLabel>
               <div className="relative">
                <FormControl>
                    <Input type="text" placeholder="5000,00" {...field} />
                </FormControl>
                <div className="absolute inset-y-0 right-0 flex items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" type="button">
                                <CalculatorIcon className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-auto p-0">
                            <Calculator 
                                onValueChange={(val) => form.setValue('limit', String(val))}
                                onClose={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Orçamento'}
        </Button>
      </form>
    </Form>
  );
}
