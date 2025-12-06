
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formSchema = z.object({
  initialAmount: z.string().min(1, 'Obrigatório'),
  monthlyDeposit: z.string().min(1, 'Obrigatório'),
  interestRate: z.string().min(1, 'Obrigatório'),
  rateType: z.enum(['monthly', 'yearly']),
  period: z.string().min(1, 'Obrigatório'),
});

type FormValues = z.infer<typeof formSchema>;

interface CalculationResult {
  totalAccumulated: number;
  totalInvested: number;
  totalInterest: number;
  monthlyData: { month: number; value: number }[];
}

export function InvestmentCalculator() {
  const [result, setResult] = useState<CalculationResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      initialAmount: '0',
      monthlyDeposit: '500',
      interestRate: '1',
      rateType: 'monthly',
      period: '120',
    },
  });

  function onSubmit(data: FormValues) {
    const initialAmount = parseFloat(data.initialAmount.replace(',', '.'));
    const monthlyDeposit = parseFloat(data.monthlyDeposit.replace(',', '.'));
    let monthlyRate = parseFloat(data.interestRate.replace(',', '.')) / 100;
    const period = parseInt(data.period, 10);

    if (data.rateType === 'yearly') {
      monthlyRate = Math.pow(1 + monthlyRate, 1 / 12) - 1;
    }

    let futureValue = initialAmount;
    const monthlyData = [{ month: 0, value: initialAmount }];

    for (let i = 1; i <= period; i++) {
      futureValue = (futureValue + monthlyDeposit) * (1 + monthlyRate);
      monthlyData.push({ month: i, value: parseFloat(futureValue.toFixed(2)) });
    }

    const totalInvested = initialAmount + monthlyDeposit * period;
    const totalInterest = futureValue - totalInvested;

    setResult({
      totalAccumulated: futureValue,
      totalInvested,
      totalInterest,
      monthlyData,
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Calculadora de Aplicação (Juros Compostos)</CardTitle>
        <CardDescription>Calcule quanto seu dinheiro pode render ao longo do tempo com depósitos mensais.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="initialAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Inicial (R$)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="1000,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthlyDeposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depósito Mensal (R$)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="500,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxa de Juros (%)</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rateType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Taxa</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período (meses)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="120" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Calcular</Button>
            </div>
            
            {result && (
              <div className="space-y-6">
                <div className="space-y-2 text-center border p-6 rounded-lg bg-muted">
                  <h3 className="text-lg font-semibold">Resultado</h3>
                  <p className="text-sm text-muted-foreground">Valor Acumulado</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(result.totalAccumulated)}</p>
                   <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                        <div className="text-left">
                            <p className="text-muted-foreground">Total Investido</p>
                            <p className="font-semibold">{formatCurrency(result.totalInvested)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground">Total em Juros</p>
                            <p className="font-semibold">{formatCurrency(result.totalInterest)}</p>
                        </div>
                   </div>
                </div>
                 <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={result.monthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" label={{ value: "Meses", position: "insideBottom", offset: -5 }}/>
                        <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Bar dataKey="value" name="Valor Acumulado" fill="hsl(var(--primary))" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
