'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useActionState, useFormStatus } from 'react';

import { useUser } from '@/firebase';
import { saveCategory, type CategoryFormState } from '@/lib/actions/categories';
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

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, { message: 'Cor inválida. Use o formato #RRGGBB.' }),
});

type FormValues = z.infer<typeof formSchema>;

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Categoria'}
    </Button>
  );
}

interface CategoryFormProps {
  existingCategory?: Category;
  onFormSubmit: () => void;
}

export function CategoryForm({ existingCategory, onFormSubmit }: CategoryFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const isEditing = !!existingCategory;

  const initialState: CategoryFormState = { message: '', errors: {} };
  const [state, dispatch] = useActionState(
    saveCategory.bind(null, user?.uid || '', existingCategory?.id || null),
    initialState
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingCategory?.name || '',
      color: existingCategory?.color || '#A9A9A9',
    },
  });

  useEffect(() => {
    if (state.message) {
      if (state.errors) {
        toast({
          title: 'Erro ao salvar categoria',
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
    formData.append('name', data.name);
    formData.append('color', data.color);
    dispatch(formData);
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
        <SubmitButton isEditing={isEditing} />
      </form>
    </Form>
  );
}

    