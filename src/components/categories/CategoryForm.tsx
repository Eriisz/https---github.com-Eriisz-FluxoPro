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
import type { Category } from '@/lib/definitions';
import { doc, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, { message: 'Cor inválida. Use o formato #RRGGBB.' }),
  type: z.enum(['income', 'expense'], { required_error: 'Selecione o tipo.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  existingCategory?: Category;
  onFormSubmit: () => void;
}

export function CategoryForm({ existingCategory, onFormSubmit }: CategoryFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!existingCategory;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingCategory?.name || '',
      color: existingCategory?.color || '#A9A9A9',
      type: existingCategory?.type || 'expense',
    },
  });

  async function onSubmit(data: FormValues) {
    if (!user) {
        toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
        return;
    }

    const id = existingCategory?.id || doc(collection(firestore, '_')).id;
    const categoryRef = doc(firestore, `users/${user.uid}/categories`, id);

    const categoryData = {
        id,
        userId: user.uid,
        name: data.name,
        color: data.color,
        type: data.type,
    };

    setDocumentNonBlocking(categoryRef, categoryData, { merge: true });

    toast({
        title: 'Sucesso!',
        description: `Categoria ${isEditing ? 'atualizada' : 'criada'} com sucesso!`,
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
              <FormLabel>Nome da Categoria</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Alimentação" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cor</FormLabel>
                <div className="flex items-center gap-2">
                    <FormControl>
                        <Input type="color" {...field} className="w-12 h-10 p-1" />
                    </FormControl>
                    <FormControl>
                        <Input placeholder="#RRGGBB" {...field} />
                    </FormControl>
                </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                  disabled={existingCategory?.name === 'Receita'}
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="expense" />
                    </FormControl>
                    <FormLabel className="font-normal">Despesa</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="income" />
                    </FormControl>
                    <FormLabel className="font-normal">Receita</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Categoria'}
        </Button>
      </form>
    </Form>
  );
}
