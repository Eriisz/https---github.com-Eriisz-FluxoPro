
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isMoney, parseMoney } from '@/lib/money';

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
import { doc, collection, setDoc } from 'firebase/firestore';
import { confirmWrite } from '@/lib/write-feedback';
import { revalidateDashboard } from '@/lib/actions';


const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter ao menos 2 caracteres.' }),
  type: z.enum(['ContaCorrente', 'CartaoCredito', 'Investimento', 'Outro'], {
    required_error: 'Selecione um tipo de conta.',
  }),
  initialBalance: z.string().refine(v => !v.trim() || isMoney(v, -Number.MAX_VALUE), 'Saldo inválido.').optional(),
  closingDay: z.string().optional(),
  dueDay: z.string().optional(),
  limit: z.string().refine(v => !v.trim() || isMoney(v), 'Limite inválido.').optional(),
}).refine(data => {
    if (data.type !== 'CartaoCredito' && (data.initialBalance === undefined || data.initialBalance.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: 'Saldo inicial é obrigatório para este tipo de conta.',
    path: ['initialBalance'],
}).superRefine((data, ctx) => {
  if (data.type === 'CartaoCredito') for (const key of ['closingDay', 'dueDay'] as const) {
    const value = Number(data[key]);
    if (!Number.isInteger(value) || value < 1 || value > 31) ctx.addIssue({ code: 'custom', path: [key], message: 'Informe um dia de 1 a 31.' });
  }
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
      initialBalance: String(existingAccount?.initialBalance ?? '0.00'),
      limit: String(existingAccount?.limit || ''),
      closingDay: String(existingAccount?.closingDay || ''),
      dueDay: String(existingAccount?.dueDay || ''),
    },
  });

  const accountType = form.watch('type');

  useEffect(() => {
    if (accountType === 'CartaoCredito' && !isEditing) {
        form.setValue('initialBalance', '0');
    }
  }, [accountType, form, isEditing])

  async function onSubmit(data: FormValues) {
    if (!user) {
      toast({ title: 'Erro', description: 'Você precisa estar logado.', variant: 'destructive' });
      return;
    }

    const id = existingAccount?.id || doc(collection(firestore, '_')).id;
    const accountRef = doc(firestore, `users/${user.uid}/accounts`, id);

    let initialBalanceValue = 0;
    if (data.initialBalance?.trim()) {
        initialBalanceValue = parseMoney(data.initialBalance)!;
    }

    const accountData: Partial<Account> = {
      id,
      userId: user.uid,
      name: data.name,
      type: data.type,
      initialBalance: initialBalanceValue,
    };

    accountData.limit = null;
    accountData.closingDay = data.type === 'CartaoCredito' ? Number(data.closingDay) : null;
    accountData.dueDay = data.type === 'CartaoCredito' ? Number(data.dueDay) : null;
    if (data.type === 'CartaoCredito') {
        accountData.limit = data.limit?.trim() ? parseMoney(data.limit)! : 0;
    }
    
    if (!await confirmWrite(setDoc(accountRef, accountData, { merge: true }), toast)) return;
    await revalidateDashboard().catch(() => undefined);
    
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
            name="initialBalance"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Saldo Inicial</FormLabel>
                <FormControl>
                    <Input type="text" placeholder="0,00" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">Este é o ponto de partida. O saldo atual será calculado com base nas transações.</p>
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
        {accountType === 'CartaoCredito' && <>
          <div className="grid grid-cols-2 gap-3">{(['closingDay', 'dueDay'] as const).map(name => <FormField key={name} control={form.control} name={name} render={({ field }) => <FormItem><FormLabel>{name === 'closingDay' ? 'Dia do fechamento' : 'Dia do vencimento'}</FormLabel><FormControl><Input type="number" min={1} max={31} {...field} /></FormControl><FormMessage /></FormItem>} />)}</div>
          <p className="text-xs text-muted-foreground">Dias inexistentes se ajustam ao fim do mês. Mudanças valem para novas compras; compras antigas sem ciclo definido usam esta configuração.</p>
        </>}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
            {form.formState.isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Conta'}
        </Button>
      </form>
    </Form>
  );
}

    
