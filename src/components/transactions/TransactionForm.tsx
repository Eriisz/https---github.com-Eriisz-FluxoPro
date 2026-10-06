
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionFormSchema, buildTransactions, editableStatus, preserveScopedRecurrence, type TransactionFormValues } from '@/lib/transactions';
import { prepareCardTransaction } from '@/lib/cards';
import { replaceTransactions, updateTransactions } from '@/lib/transaction-writes';
import { CalendarIcon, Calculator as CalculatorIcon, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calculator } from '@/components/shared/Calculator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Account, Category, Transaction } from '@/lib/definitions';
import { CategoryDialog } from '../categories/CategoryDialog';
import { collection, doc } from 'firebase/firestore';
import { useData } from '@/context/DataContext';
import { AccountDialog } from '../accounts/AccountDialog';
import { revalidateDashboard } from '@/lib/actions';


interface TransactionFormProps {
    accounts: Account[];
    categories: Category[];
    onFormSubmit: () => void;
    transaction?: Transaction;
}

type FormValues = TransactionFormValues;

export function TransactionForm({ accounts: initialAccounts, categories: initialCategories, onFormSubmit, transaction }: TransactionFormProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { categories, accounts, isLoading: isDataLoading } = useData();
  const isEditing = !!transaction;
  

  const form = useForm<FormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: isEditing ? {
        description: transaction.description,
        value: String(Math.abs(transaction.value)),
        date: new Date(transaction.date),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        status: editableStatus(transaction),
        frequency: transaction.groupId ? (transaction.installments ? 'installment' : 'recurring') : 'single',
        installments: String(transaction.installments?.total || '1'),
        updateScope: 'current'
    } : {
      description: '',
      value: '',
      date: new Date(),
      accountId: '',
      categoryId: '',
      type: 'expense',
      status: 'PAID',
      frequency: 'single',
      installments: '1',
    },
  });

  const transactionFrequency = form.watch('frequency');
  const transactionType = form.watch('type');
  const selectedAccountId = form.watch('accountId');
  const installmentCount = form.watch('installments');
  const updateScope = form.watch('updateScope');
  const preserveGroupStructure = !!transaction?.groupId && updateScope !== 'all';
  const originalFrequency = transaction?.groupId ? (transaction.installments ? 'installment' : 'recurring') : 'single';
  const isRestructuring = isEditing && !preserveGroupStructure && (transactionFrequency !== originalFrequency ||
    (originalFrequency === 'installment' && Number(installmentCount) !== transaction?.installments?.total));
  useEffect(() => {
    if (isRestructuring) form.setValue('value', '');
  }, [isRestructuring, form]);
  
  const allCategories = categories || initialCategories;
  const allAccounts = accounts || initialAccounts;
  const isCard = allAccounts.some(account => account.id === selectedAccountId && account.type === 'CartaoCredito');
  useEffect(() => { if (isCard && !isEditing) { form.setValue('status', 'PENDING'); form.setValue('type', 'expense'); } }, [isCard, isEditing, form, transactionType]);

  useEffect(() => {
    if (transactionType === 'income' && !isEditing) {
      const incomeCategory = allCategories.find(c => c.name === 'Receita' && c.type === 'income');
      if (incomeCategory) {
        form.setValue('categoryId', incomeCategory.id);
      }
    }
  }, [transactionType, allCategories, form, user, firestore, isDataLoading, isEditing]);

  useEffect(() => {
    if (!isEditing) {
        form.setValue('status', isCard ? 'PENDING' : transactionType === 'income' ? 'RECEIVED' : 'PAID');
    }
  }, [transactionType, form, isEditing, isCard]);

  async function onSubmit(values: FormValues) {
    const data = preserveScopedRecurrence(values, transaction);
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    if (!allAccounts) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Contas não carregadas.' });
        return;
    }

    if (!allAccounts.some(account => account.id === data.accountId) ||
        !allCategories.some(category => category.id === data.categoryId && category.type === data.type)) {
      toast({ variant: 'destructive', title: 'Seleção inválida', description: 'Selecione uma conta e uma categoria compatível com o tipo de transação.' });
      return;
    }
    setIsSubmitting(true);

    // If recurring, we don't show the input, so we set a default value here.
    if (data.frequency === 'recurring') {
        data.installments = '24'; // Creates 2 years of recurring transactions
    }
    
    try {
        const originalFrequency = isEditing && transaction?.groupId ? (transaction.installments ? 'installment' : 'recurring') : 'single';
        const newFrequency = data.frequency;
        
        const originalInstallmentCount = isEditing && transaction?.installments ? transaction.installments.total : 1;
        const newInstallmentCount = newFrequency !== 'single' ? parseInt(data.installments || '1', 10) : 1;
        
        const isFrequencyChanged = isEditing && originalFrequency !== newFrequency;
        const isInstallmentCountChanged = isEditing && originalFrequency === 'installment' && originalInstallmentCount !== newInstallmentCount;
        

        if (isEditing && !isFrequencyChanged && !isInstallmentCountChanged) {
            // ===== NON-DESTRUCTIVE EDIT =====
            await updateTransactions(firestore, user.uid, transaction!, data, allAccounts);
            toast({ title: "Sucesso!", description: "Transação(ões) atualizada(s) com sucesso!" });
        } else {
            // ===== CREATE NEW OR DESTRUCTIVE EDIT =====

            if (isEditing && transaction?.groupId && data.updateScope !== 'all') {
                throw new Error('Para mudar a frequência ou o número de parcelas, selecione todas as transações do grupo.');
            }
            const transactionsCol = collection(firestore, `users/${user.uid}/transactions`);
            const account = allAccounts.find(item => item.id === data.accountId)!;
            const replacements = buildTransactions(data, user.uid, () => doc(transactionsCol).id).map(row => prepareCardTransaction(row, account, data.date.toISOString()));
            await replaceTransactions(firestore, user.uid, replacements, transaction);

            const toastMessage = isEditing ? "Transação reestruturada com sucesso!" : `Transação ${newInstallmentCount > 1 ? newFrequency : ''} adicionada com sucesso!`;
            toast({ title: "Sucesso!", description: toastMessage });
        }

        await revalidateDashboard().catch(() => undefined);
        form.reset();
        onFormSubmit();

    } catch (error) {
        console.error("Failed to process transaction:", error);
        toast({
            variant: 'destructive',
            title: "Erro ao processar transação",
            description: error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const filteredCategories = React.useMemo(() => {
    return allCategories.filter(c => c.type === transactionType);
  }, [allCategories, transactionType]);


  if (isUserLoading || isDataLoading) return <div>Carregando...</div>;

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isCard && <p className="rounded-md bg-muted p-3 text-sm">Compras de cartão ficam pendentes até registrar o pagamento na tela de Faturas.</p>}
        {isEditing && transaction?.groupId && (
            <FormField
            control={form.control}
            name="updateScope"
            render={({ field }) => (
                <FormItem className="space-y-3 bg-muted p-3 rounded-md border">
                <FormLabel className="text-sm font-semibold">Aplicar alterações em:</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={(scope: FormValues['updateScope']) => {
                      const values = preserveScopedRecurrence({ ...form.getValues(), updateScope: scope }, transaction);
                      field.onChange(scope);
                      form.setValue('frequency', values.frequency);
                      form.setValue('installments', values.installments);
                    }}
                    value={field.value}
                    className="flex flex-col space-y-1"
                    >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="current" />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                        Somente este mês (esta transação)
                        </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="future" />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                        Esta e as próximas transações
                        </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="all" />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                        Todas as transações (passadas e futuras)
                        </FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {updateScope === 'current'
                    ? 'O valor e os demais dados serão alterados apenas neste lançamento. Os meses anteriores e futuros serão preservados.'
                    : updateScope === 'future'
                      ? 'As alterações serão aplicadas a este lançamento e aos próximos, preservando os anteriores.'
                      : 'As alterações serão aplicadas a todos os lançamentos do grupo.'}
                </p>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('categoryId', ''); // Reset category on type change
                  }}
                  defaultValue={field.value}
                  className="flex justify-center space-x-4"
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
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Almoço no restaurante" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{transactionFrequency === 'installment' && (!isEditing || isRestructuring) ? 'Valor total (R$)' : 'Valor (R$)'}</FormLabel>
              {isRestructuring && <p className="text-sm text-muted-foreground">Informe novamente o valor. Ao parcelar, este será o total dividido entre as novas parcelas. O grupo será recriado a partir da data selecionada.</p>}
              {isEditing && !isRestructuring && transactionFrequency === 'installment' && <p className="text-sm text-muted-foreground">Valor desta parcela. Se alterar o valor e selecionar o grupo, cada parcela selecionada receberá o valor informado.</p>}
              <div className="relative">
                <FormControl>
                  <Input placeholder="0,00" {...field} />
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
                                onValueChange={(val) => form.setValue('value', String(val))}
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <div className="flex items-center gap-2">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" onClick={() => setCategoryDialogOpen(true)}>
                    <PlusCircle className="h-4 w-4"/>
                </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conta</FormLabel>
                <div className="flex items-center gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(allAccounts || []).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setAccountDialogOpen(true)}>
                    <PlusCircle className="h-4 w-4"/>
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data da Transação</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                         disabled={isEditing && !!transaction?.groupId && updateScope !== 'current'}
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
           <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isCard}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionType === 'income' ? (
                        <>
                          <SelectItem value="RECEIVED">Recebido</SelectItem>
                          <SelectItem value="PENDING">Pendente</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="PAID">Pago</SelectItem>
                          <SelectItem value="PENDING">Pendente</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Frequência</FormLabel>
              {preserveGroupStructure && (
                <p className="text-xs text-muted-foreground">
                  A frequência do grupo será mantida. Para ajustar o valor deste mês, edite o campo Valor.
                  Para mudar a frequência ou o número de parcelas, selecione todas as transações.
                </p>
              )}
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={preserveGroupStructure}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="single" />
                    </FormControl>
                    <FormLabel className="font-normal">Única</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="installment" />
                    </FormControl>
                    <FormLabel className="font-normal">Parcelada</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="recurring" />
                    </FormControl>
                    <FormLabel className="font-normal">Recorrente</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {transactionFrequency === 'installment' && (
          <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Parcelas</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ex: 12" {...field} disabled={preserveGroupStructure} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar Transação'}
        </Button>
      </form>
    </Form>
    <CategoryDialog isOpen={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} category={{type: transactionType}}/>
    <AccountDialog isOpen={accountDialogOpen} onOpenChange={setAccountDialogOpen} />
    </>
  );
}

    
