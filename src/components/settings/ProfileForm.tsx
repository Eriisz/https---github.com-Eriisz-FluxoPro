'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { useUser } from '@/firebase';
import { saveProfile, type ProfileFormState } from '@/lib/actions/settings';
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
import type { User as UserProfile } from '@/lib/definitions';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
});

type FormValues = z.infer<typeof formSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar Alterações'}
    </Button>
  );
}

interface ProfileFormProps {
  userProfile?: UserProfile | null;
}

export function ProfileForm({ userProfile }: ProfileFormProps) {
  const { user } = useUser();
  const { toast } = useToast();

  const initialState: ProfileFormState = { message: '', errors: {} };
  const saveProfileWithId = saveProfile.bind(null, user?.uid || '');
  const [state, dispatch] = useActionState(
    saveProfileWithId,
    initialState
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: userProfile?.name || '',
    },
  });
  
  useEffect(() => {
    if (userProfile) {
        form.reset({ name: userProfile.name });
    }
  }, [userProfile, form]);

  useEffect(() => {
    if (state.message) {
      if (state.errors) {
        toast({
          title: 'Erro ao salvar perfil',
          description: state.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso!',
          description: state.message,
        });
      }
    }
  }, [state, toast]);

  function onSubmit(data: FormValues) {
    const formData = new FormData();
    formData.append('name', data.name);
    dispatch(formData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Seu nome completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
            <FormLabel>Celular</FormLabel>
            <FormControl>
                <Input value={userProfile?.phoneNumber} disabled />
            </FormControl>
            <p className="text-xs text-muted-foreground">
                O número de celular é usado para login e não pode ser alterado.
            </p>
        </FormItem>
        <SubmitButton />
      </form>
    </Form>
  );
}
