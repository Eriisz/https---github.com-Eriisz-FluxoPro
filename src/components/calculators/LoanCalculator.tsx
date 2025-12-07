
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useData } from '@/context/DataContext';

const formSchema = z.object({
  loanAmount: z.string().min(1, 'Obrigatório'),
  interestRate: z.string().min(1, 'Obrigatório'),
  period: z.string().min(1, 'Obrigatório'),
});

type FormValues = z.infer<typeof formSchema>;

interface CalculationResult {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  amortizationSchedule: {
    month: number;
    payment: number;
    interest: number;
    principal: number;
    balance: number;
  }[];
}

export function LoanCalculator() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const { isBalanceVisible } = useData();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loanAmount: '50000',
      interestRate: '2',
      period: '60',
    },
  });

  function onSubmit(data: FormValues) {
    const principal = parseFloat(data.loanAmount.replace(',', '.'));
    const monthlyRate = parseFloat(data.interestRate.replace(',', '.')) / 100;
    const numberOfMonths = parseInt(data.period, 10);

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfMonths)) / (Math.pow(1 + monthlyRate, numberOfMonths) - 1);
    
    const totalPaid = monthlyPayment * numberOfMonths;
    const totalInterest = totalPaid - principal;
    
    let balance = principal;
    const amortizationSchedule = [];
    for (let i = 1; i <= numberOfMonths; i++) {
        const interestPaid = balance * monthlyRate;
        const principalPaid = monthlyPayment - interestPaid;
        balance -= principalPaid;
        amortizationSchedule.push({
            month: i,
            payment: monthlyPayment,
            interest: interestPaid,
            principal: principalPaid,
            balance: balance > 0 ? balance : 0
        });
    }

    setResult({
      monthlyPayment,
      totalPaid,
      totalInterest,
      amortizationSchedule,
    });
  }

  const hiddenValue = '•••••';
  const valueFormatter = (value: number) => isBalanceVisible ? formatCurrency(value) : hiddenValue;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Calculadora de Financiamento (Tabela Price)</CardTitle>
        <CardDescription>Simule o custo de um financiamento com prestações fixas.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="loanAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Financiamento (R$)</FormLabel>
                    <FormControl>
                      <Input type={isBalanceVisible ? 'text' : 'password'} placeholder="50000,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Juros Mensal (%)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Parcelas (meses)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Calcular</Button>
            </div>

            {result && (
              <div className="space-y-4">
                <div className="space-y-2 text-center border p-6 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Valor da Parcela Mensal</p>
                    <p className="text-3xl font-bold text-primary">{valueFormatter(result.monthlyPayment)}</p>
                     <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                        <div className="text-left">
                            <p className="text-muted-foreground">Total Pago</p>
                            <p className="font-semibold">{valueFormatter(result.totalPaid)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground">Total em Juros</p>
                            <p className="font-semibold">{valueFormatter(result.totalInterest)}</p>
                        </div>
                   </div>
                </div>
                <h3 className="text-lg font-semibold pt-4">Tabela de Amortização</h3>
                <ScrollArea className="h-72 rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-secondary">
                            <TableRow>
                                <TableHead>Mês</TableHead>
                                <TableHead>Juros</TableHead>
                                <TableHead>Amortização</TableHead>
                                <TableHead>Saldo Devedor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.amortizationSchedule.map(row => (
                                <TableRow key={row.month}>
                                    <TableCell>{row.month}</TableCell>
                                    <TableCell>{valueFormatter(row.interest)}</TableCell>
                                    <TableCell>{valueFormatter(row.principal)}</TableCell>
                                    <TableCell>{valueFormatter(row.balance)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
