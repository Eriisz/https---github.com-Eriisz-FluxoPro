
'use client';

import React from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import { usePlan } from '@/context/PlanContext';
import { saveBudget } from '@/lib/budget-writes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isMoney, parseMoney } from '@/lib/money';
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
import { confirmWrite } from '@/lib/write-feedback';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calculator } from '../shared/Calculator';
import { revalidateDashboard } from '@/lib/actions';

const formSchema = z.object({
  categoryId: z.string().default(""),
  limit: z.string().refine(v => isMoney(v, 0.01), 'Informe um limite válido maior que zero.'),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês deve estar no formato AAAA-MM.'),
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
  const { categories } = useData();
  const { allows } = usePlan();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: existingBudget?.categoryId || '',
      limit: String(existingBudget?.limit || ''),
      month: existingBudget?.month || format(new Date(), 'yyyy-MM'),
    },
  });

  async function onSubmit(data: FormValues) {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }

    if (data.categoryId && !allows('categoryBudgets')) {
      toast({ title: 'Recurso Premium', description: 'Simule Premium ou Vitalício em Planos para definir limites por categoria.' }); return;
    }
    if (!await confirmWrite(saveBudget(firestore, user.uid, { month: data.month, categoryId: data.categoryId || null, limit: parseMoney(data.limit)! }, existingBudget?.id), toast)) return;
    await revalidateDashboard().catch(() => undefined);
    
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
                        <Input type="month" {...field} disabled={isEditing} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField control={form.control} name="categoryId" render={({ field }) => <FormItem><FormLabel>Aplicar limite a</FormLabel><FormControl><select {...field} disabled={isEditing || !allows('categoryBudgets')} className="h-10 w-full rounded-md border bg-background px-3"><option value="">Todas as despesas do mês</option>{(categories || []).filter(category => category.type === 'expense').map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormControl><FormMessage /></FormItem>} />
        {!allows('categoryBudgets') && <p className="text-xs text-muted-foreground"><Link href="/plans" className="underline">Simule Premium</Link> para definir um limite por categoria.</p>}
        <FormField
          control={form.control}
          name="limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite de Gasto (R$)</FormLabel>
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
