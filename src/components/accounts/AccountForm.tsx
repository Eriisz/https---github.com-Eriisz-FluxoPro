'use client';

import React, { useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Account } from '@/lib/definitions';
import { doc, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
  type: z.enum(['ContaCorrente', 'CartaoCredito', 'Investimento', 'Outro'], {
    required_error: 'Selecione um tipo de conta.',
  }),
  balance: z.string().optional(),
  limit: z.string().optional(),
}).refine(data => {
    // Balance is required if it is not a credit card
    if (data.type !== 'CartaoCredito' && !data.balance) {
      return false;
    }
    return true;
  }, {
    message: 'Saldo inicial é obrigatório para este tipo de conta.',
    path: ['balance'],
});


type FormValues = z.infer<typeof formSchema>;

interface AccountFormProps {
  existingAccount?: Account;
  onFormSubmit: () => void;
}

export function AccountForm({ existingAccount, onFormSubmit }: AccountFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditing = !!existingAccount;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existingAccount?.name || '',
      type: existingAccount?.type || 'ContaCorrente',
      balance: String(existingAccount?.balance || '0.00'),
      limit: String(existingAccount?.limit || ''),
    },
  });

  const accountType = form.watch('type');

  useEffect(() => {
    if (accountType === 'CartaoCredito' && !isEditing) {
        form.setValue('balance', '0');
    }
  }, [accountType, form, isEditing])

  async function onSubmit(data: FormValues) {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }

    const id = existingAccount?.id || doc(collection(firestore, '_')).id;
    const accountRef = doc(firestore, `users/${user.uid}/accounts`, id);

    const balanceValue = data.balance ? parseFloat(data.balance.replace(',', '.')) : 0;
    
    const accountData = {
      id,
      userId: user.uid,
      name: data.name,
      type: data.type,
      balance: balanceValue,
      ...(data.type === 'CartaoCredito' && data.limit ? { limit: parseFloat(data.limit.replace(',', '.')) } : { limit: null }),
    };
    
    setDocumentNonBlocking(accountRef, accountData, { merge: true });
    
    toast({
        title: 'Sucesso!',
        description: `Conta ${isEditing ? 'atualizada' : 'criada'} com sucesso!`,
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
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

        {accountType !== 'CartaoCredito' && (
            <FormField
            control={form.control}
            name="balance"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Saldo</FormLabel>
                <FormControl>
                    <Input type="text" placeholder="0,00" {...field} disabled={isEditing} />
                </FormControl>
                {isEditing && <p className="text-xs text-muted-foreground">O saldo é atualizado automaticamente pelas transações.</p>}
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
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Conta'}
        </Button>
      </form>
    </Form>
  );
}
