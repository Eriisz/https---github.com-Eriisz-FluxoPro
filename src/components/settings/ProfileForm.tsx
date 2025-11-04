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
import type { User as UserProfile } from '@/lib/definitions';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface ProfileFormProps {
  userProfile?: UserProfile | null;
}

export function ProfileForm({ userProfile }: ProfileFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: userProfile?.name || '',
    },
  });
  
  React.useEffect(() => {
    if (userProfile) {
        form.reset({ name: userProfile.name });
    }
  }, [userProfile, form]);

  async function onSubmit(data: FormValues) {
    if (!user) {
        toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
        return;
    }
    const userRef = doc(firestore, `users/${user.uid}`);
    setDocumentNonBlocking(userRef, { name: data.name }, { merge: true });
    toast({ title: 'Sucesso!', description: 'Perfil atualizado com sucesso.' });
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
        <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>
    </Form>
  );
}
