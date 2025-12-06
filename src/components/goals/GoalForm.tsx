
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { revalidateDashboard } from '@/lib/actions';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
  targetAmount: z.string().refine(v => !isNaN(parseFloat(v)), { message: 'Valor alvo inválido.'}),
  currentAmount: z.string().refine(v => !isNaN(parseFloat(v)), { message: 'Valor atual inválido.'}),
  targetDate: z.date({ required_error: 'Data alvo é obrigatória.'}),
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
      targetDate: existingGoal ? new Date(existingGoal.targetDate) : new Date(),
    },
  });

  async function onSubmit(data: FormValues) {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }

    const id = existingGoal?.id || doc(collection(firestore, '_')).id;
    const goalRef = doc(firestore, `users/${user.uid}/goals`, id);

    const goalData: Goal = {
      id,
      userId: user.uid,
      name: data.name,
      targetAmount: parseFloat(data.targetAmount.replace(',', '.')),
      currentAmount: parseFloat(data.currentAmount.replace(',', '.')),
      targetDate: data.targetDate.toISOString(),
    };

    setDocumentNonBlocking(goalRef, goalData, { merge: true });
    await revalidateDashboard();
    
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
        <FormField
          control={form.control}
          name="targetDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data Alvo</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
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
