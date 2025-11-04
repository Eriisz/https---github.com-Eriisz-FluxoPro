'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { format } from 'date-fns';

import { useUser } from '@/firebase';
import { saveBudget, type BudgetFormState } from '@/lib/actions/budgets';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Budget, Category } from '@/lib/definitions';

const formSchema = z.object({
  categoryId: z.string().min(1, 'Selecione uma categoria.'),
  limit: z.string().min(1, 'Limite é obrigatório.'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Mês deve estar no formato AAAA-MM.'),
});

type FormValues = z.infer<typeof formSchema>;

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Orçamento'}
    </Button>
  );
}

interface BudgetFormProps {
  existingBudget?: Budget;
  onFormSubmit: () => void;
  categories: Category[];
}

export function BudgetForm({ existingBudget, onFormSubmit, categories }: BudgetFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const isEditing = !!existingBudget;

  const initialState: BudgetFormState = { message: '', errors: {} };
  const saveBudgetWithIds = saveBudget.bind(null, user?.uid || '', existingBudget?.id || null);
  const [state, dispatch] = useActionState(
    saveBudgetWithIds,
    initialState
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: existingBudget?.categoryId || '',
      limit: String(existingBudget?.limit || ''),
      month: existingBudget?.month || format(new Date(), 'yyyy-MM'),
    },
  });

  useEffect(() => {
    if (state.message) {
      if (state.errors) {
        toast({
          title: 'Erro ao salvar orçamento',
          description: state.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso!',
          description: state.message,
        });
        onFormSubmit();
        form.reset();
      }
    }
  }, [state, toast, onFormSubmit, form]);

  function onSubmit(data: FormValues) {
    const formData = new FormData();
    formData.append('categoryId', data.categoryId);
    formData.append('limit', data.limit);
    formData.append('month', data.month);
    dispatch(formData);
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
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite de Gasto (R$)</FormLabel>
              <FormControl>
                <Input type="text" placeholder="500,00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton isEditing={isEditing} />
      </form>
    </Form>
  );
}
