'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { useUser } from '@/firebase';
import { saveAccount, type AccountFormState } from '@/lib/actions/accounts';
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
import type { Account } from '@/lib/definitions';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
  type: z.enum(['ContaCorrente', 'CartaoCredito', 'Investimento', 'Outro'], {
    required_error: 'Selecione um tipo de conta.',
  }),
  initialBalance: z.string().optional(),
  limit: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Conta'}
    </Button>
  );
}

interface AccountFormProps {
  existingAccount?: Account;
  onFormSubmit: () => void;
}

export function AccountForm({ existingAccount, onFormSubmit }: AccountFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const isEditing = !!existingAccount;

  const initialState: AccountFormState = { message: '', errors: {} };
  const saveAccountWithIds = saveAccount.bind(null, user?.uid || '', existingAccount?.id || null);
  const [state, dispatch] = useActionState(
    saveAccountWithIds,
    initialState
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingAccount?.name || '',
      type: existingAccount?.type || 'ContaCorrente',
      initialBalance: String(existingAccount?.balance || '0.00'),
      limit: String(existingAccount?.limit || ''),
    },
  });

  const accountType = form.watch('type');

  useEffect(() => {
    if (state.message) {
      if (state.errors) {
        toast({
          title: 'Erro ao salvar conta',
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
    formData.append('type', data.type);
    if (!isEditing) {
        formData.append('initialBalance', data.initialBalance || '0');
    }
    if (data.type === 'CartaoCredito' && data.limit) {
      formData.append('limit', data.limit);
    }
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
              <FormLabel>Nome da Conta</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Conta Principal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Conta</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ContaCorrente">Conta Corrente</SelectItem>
                  <SelectItem value="CartaoCredito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
            <FormField
            control={form.control}
            name="initialBalance"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Saldo Inicial</FormLabel>
                <FormControl>
                    <Input type="text" placeholder="0,00" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}


        {accountType === 'CartaoCredito' && (
          <FormField
            control={form.control}
            name="limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limite do Cartão</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="1000,00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <SubmitButton isEditing={isEditing} />
      </form>
    </Form>
  );
}
