
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Calculator as CalculatorIcon, PlusCircle } from 'lucide-react';
import { format, isPast, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Account, Category, Transaction } from '@/lib/definitions';
import { CategoryDialog } from '../categories/CategoryDialog';
import { collection, doc } from 'firebase/firestore';
import { addMonths } from 'date-fns';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
    categoryId: z.string().optional(),
    type: z.enum(['income', 'expense'], { required_error: "Selecione o tipo." }),
    status: z.enum(['PAID', 'PENDING', 'RECEIVED', 'LATE'], { required_error: "Selecione um status." }),
    isRecurring: z.boolean().default(false),
    installments: z.string().optional(),
  }).refine(data => {
    if (data.type === 'expense' && !data.categoryId) {
        return false;
    }
    return true;
  }, {
    message: "Selecione uma categoria para despesas.",
    path: ["categoryId"],
  });

type FormValues = z.infer<typeof formSchema>;

export function TransactionForm({ accounts, categories: initialCategories, onFormSubmit, transaction }: TransactionFormProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!transaction;
  

  const categoriesQuery = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/categories`) : null),
    [firestore, user]
  );
  const { data: categories, isLoading: loadingCategories } = useCollection<Category>(categoriesQuery);


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
        isRecurring: !!transaction.groupId,
        installments: String(transaction.installments?.total || '1')
    } : {
      description: '',
      value: '',
      date: new Date(),
      accountId: '',
      categoryId: '',
      type: 'expense',
      status: 'PAID',
      isRecurring: false,
      installments: '1',
    },
  });

  const isRecurring = form.watch('isRecurring');
  const transactionType = form.watch('type');

  useEffect(() => {
    if (!isEditing) {
        form.setValue('status', transactionType === 'income' ? 'RECEIVED' : 'PAID');
    }
  }, [transactionType, form, isEditing]);

  async function onSubmit(data: FormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSubmitting(true);
    
    try {
        const category = (categories || initialCategories).find(c => c.id === data.categoryId);
        const account = accounts.find(a => a.id === data.accountId);

        if ((data.type === 'expense' && !category) || !account) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Categoria ou conta inválida.' });
            setIsSubmitting(false);
            return;
        }

        const value = parseFloat(data.value.replace(',', '.'));
        const transactionValue = data.type === 'expense' ? -value : value;
        
        let finalStatus = data.status;
        if (data.status === 'LATE') {
            finalStatus = 'PENDING';
        }

        if (isEditing && transaction) {
            const transactionRef = doc(firestore, `users/${user.uid}/transactions`, transaction.id);
            const updatedTransaction: Partial<Transaction> = {
                description: data.description,
                value: transactionValue,
                date: data.date.toISOString(),
                accountId: data.accountId,
                categoryId: data.categoryId || '',
                type: data.type,
                status: finalStatus,
            };
            setDocumentNonBlocking(transactionRef, updatedTransaction, { merge: true });
            toast({
                title: "Sucesso!",
                description: "Transação atualizada com sucesso!",
            });

        } else {
            const transactionsCol = collection(firestore, `users/${user.uid}/transactions`);
            const installments = data.isRecurring ? parseInt(data.installments || '1', 10) : 1;
            const groupId = installments > 1 ? doc(collection(firestore, '_')).id : undefined;

            for (let i = 0; i < installments; i++) {
                const transactionDate = addMonths(data.date, i);
                
                const newTransaction: Omit<Transaction, 'id'> = {
                    userId: user.uid,
                    description: data.description,
                    value: transactionValue,
                    date: transactionDate.toISOString(),
                    accountId: data.accountId,
                    categoryId: data.categoryId || '',
                    type: data.type,
                    status: finalStatus,
                    ...(groupId && { groupId }),
                    ...(installments > 1 && { installments: { current: i + 1, total: installments } }),
                };
                
                addDocumentNonBlocking(transactionsCol, newTransaction);
            }

            toast({
                title: "Sucesso!",
                description: `Transação ${installments > 1 ? 'parcelada ' : ''}adicionada com sucesso!`,
            });
        }


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
    if (!categories && !initialCategories) return [];
    return (categories || initialCategories).filter(c => c.type === transactionType);
  }, [categories, initialCategories, transactionType]);


  if (isUserLoading || loadingCategories) return <div>Carregando...</div>;

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <Select onValueChange={field.onChange} value={field.value} disabled={transactionType === 'income'}>
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
                <Button type="button" variant="ghost" size="icon" onClick={() => setCategoryDialogOpen(true)} disabled={transactionType === 'income'}>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                          <SelectItem value="LATE">Atrasado</SelectItem>
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
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Parcelamento / Recorrência</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isEditing}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {isRecurring && !isEditing && (
            <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Número de Parcelas / Meses</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="Ex: 12" {...field} disabled={isEditing} />
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
    </>
  );
}
