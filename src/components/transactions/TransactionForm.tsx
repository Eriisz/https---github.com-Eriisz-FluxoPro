
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Calculator as CalculatorIcon, PlusCircle } from 'lucide-react';
import { format, isPast, startOfToday } from 'date-fns';
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
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { addMonths } from 'date-fns';
import { useData } from '@/context/DataContext';
import { AccountDialog } from '../accounts/AccountDialog';
import { revalidateDashboard } from '@/lib/actions';


interface TransactionFormProps {
    accounts: Account[];
    categories: Category[];
    onFormSubmit: () => void;
    transaction?: Transaction;
}

const formSchema = z.object({
    description: z.string().min(2, { message: "Descrição precisa ter ao menos 2 caracteres." }),
    value: z.string().refine(val => !isNaN(parseFloat(val.replace(',', '.'))), { message: "Valor inválido." }),
    date: z.date(),
    accountId: z.string().min(1, { message: "Selecione uma conta." }),
    categoryId: z.string().min(1, { message: "Selecione uma categoria." }),
    type: z.enum(['income', 'expense'], { required_error: "Selecione o tipo." }),
    status: z.enum(['PAID', 'PENDING', 'RECEIVED', 'LATE'], { required_error: "Selecione um status." }),
    frequency: z.enum(['single', 'installment', 'recurring']).default('single'),
    installments: z.string().optional(),
    updateScope: z.enum(['current', 'future', 'all']).default('current').optional(),
  });

type FormValues = z.infer<typeof formSchema>;

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
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? {
        description: transaction.description,
        value: String(Math.abs(transaction.value)),
        date: new Date(transaction.date),
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        status: (transaction.status === 'PENDING' && isPast(new Date(transaction.date)) && new Date(transaction.date) < startOfToday()) ? 'LATE' : transaction.status,
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
  
  const allCategories = categories || initialCategories;
  const allAccounts = accounts || initialAccounts;

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
        form.setValue('status', transactionType === 'income' ? 'RECEIVED' : 'PAID');
    }
  }, [transactionType, form, isEditing]);

  async function handleUpdateTransactions(data: FormValues) {
    if (!user || !transaction) return;
  
    const batch = writeBatch(firestore);
  
    let finalStatus = data.status === 'LATE' ? 'PENDING' : data.status;
    const updateData: any = {
      description: data.description,
      value: data.type === 'expense' ? -parseFloat(data.value.replace(',', '.')) : parseFloat(data.value.replace(',', '.')),
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type,
      status: finalStatus,
    };
  
    if (data.updateScope === 'current' || !transaction.groupId) {
      const docRef = doc(firestore, `users/${user.uid}/transactions`, transaction.id);
      batch.update(docRef, {...updateData, date: data.date.toISOString()});
    } else {
      // For recurring/installment, we only update some fields, preserving original date and installment count
      const { ...restOfUpdateData } = updateData;

      const transactionsCol = collection(firestore, `users/${user.uid}/transactions`);
      const q = query(transactionsCol, where('groupId', '==', transaction.groupId));
      const querySnapshot = await getDocs(q);
  
      querySnapshot.forEach(docSnap => {
        const currentTransaction = docSnap.data() as Transaction;
        const currentDate = new Date(currentTransaction.date);
        
        let shouldUpdate = false;
        if (data.updateScope === 'all') {
          shouldUpdate = true;
        } else if (data.updateScope === 'future') {
          const originalDate = new Date(transaction.date);
          shouldUpdate = currentDate.getTime() >= originalDate.getTime();
        }
  
        if (shouldUpdate) {
          batch.update(docSnap.ref, restOfUpdateData);
        }
      });
    }
  
    await batch.commit();
  }


  async function onSubmit(data: FormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    if (!allAccounts) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Contas não carregadas.' });
        return;
    }

    setIsSubmitting(true);
    
    try {
        if (isEditing) {
            await handleUpdateTransactions(data);
            toast({
                title: "Sucesso!",
                description: "Transação(ões) atualizada(s) com sucesso!",
            });
        } else {
            const batch = writeBatch(firestore);
            const transactionsCol = collection(firestore, `users/${user.uid}/transactions`);
            const groupId = data.frequency !== 'single' ? doc(collection(firestore, '_')).id : undefined;
            const totalValue = parseFloat(data.value.replace(',', '.'));
            const numberOfInstallments = data.frequency !== 'single' ? parseInt(data.installments || '1', 10) : 1;

            for (let i = 0; i < numberOfInstallments; i++) {
                const transactionDate = addMonths(data.date, i);
                
                let installmentValue = totalValue;
                if (data.frequency === 'installment') {
                    installmentValue = totalValue / numberOfInstallments;
                }

                const transactionValue = data.type === 'expense' ? -installmentValue : installmentValue;
                
                let finalStatus = data.status;
                if (data.status === 'LATE') {
                    finalStatus = 'PENDING';
                }

                const transactionId = doc(collection(firestore, '_')).id;
                const newTransactionData: Transaction = {
                    id: transactionId,
                    userId: user.uid,
                    description: data.description,
                    value: transactionValue,
                    date: transactionDate.toISOString(),
                    accountId: data.accountId,
                    categoryId: data.categoryId || '',
                    type: data.type,
                    status: finalStatus,
                    ...(groupId && { groupId }),
                    ...(numberOfInstallments > 1 && { installments: { current: i + 1, total: numberOfInstallments } }),
                };
                const newDocRef = doc(transactionsCol, transactionId);
                batch.set(newDocRef, newTransactionData);
            }
            
            await batch.commit();

            toast({
                title: "Sucesso!",
                description: `Transação ${numberOfInstallments > 1 ? data.frequency : ''} adicionada com sucesso!`,
            });
        }

        await revalidateDashboard();
        form.reset();
        onFormSubmit();

    } catch (error) {
        console.error("Failed to process transaction:", error);
        toast({
            variant: 'destructive',
            title: "Erro ao processar transação",
            description: "Ocorreu um erro inesperado. Tente novamente.",
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
        {isEditing && transaction?.groupId && (
            <FormField
            control={form.control}
            name="updateScope"
            render={({ field }) => (
                <FormItem className="space-y-3 bg-muted p-3 rounded-md border">
                <FormLabel className="text-sm font-semibold">Aplicar alterações em:</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="current" />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">
                        Somente esta transação
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
                  disabled={isEditing}
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
              <FormLabel>Valor</FormLabel>
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
                         disabled={isEditing && !!transaction?.groupId && form.getValues('updateScope') !== 'current'}
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex space-x-4"
                  disabled={isEditing}
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
        {transactionFrequency !== 'single' && !isEditing && (
            <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
                <FormItem>
                <FormLabel>{transactionFrequency === 'installment' ? 'Número de Parcelas' : 'Número de Meses'}</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="Ex: 12" {...field} />
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

    
