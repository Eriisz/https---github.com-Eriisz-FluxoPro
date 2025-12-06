
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
import { TrendingUp } from 'lucide-react';

const formSchema = z.object({
  presentValue: z.string().min(1, 'Obrigatório'),
  interestRate: z.string().min(1, 'Obrigatório'),
  rateType: z.enum(['monthly', 'yearly']),
  period: z.string().min(1, 'Obrigatório'),
  periodType: z.enum(['months', 'years']),
});

type FormValues = z.infer<typeof formSchema>;

interface CalculationResult {
  futureValue: number;
  totalInterest: number;
}

export function FutureValueCalculator() {
  const [result, setResult] = useState<CalculationResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      presentValue: '10000',
      interestRate: '12',
      rateType: 'yearly',
      period: '5',
      periodType: 'years',
    },
  });

  function onSubmit(data: FormValues) {
    const presentValue = parseFloat(data.presentValue.replace(',', '.'));
    let rate = parseFloat(data.interestRate.replace(',', '.'));
    let n = parseInt(data.period, 10);

    // Convert everything to months for a consistent calculation
    let monthlyRate: number;
    if (data.rateType === 'yearly') {
        monthlyRate = Math.pow(1 + rate / 100, 1/12) - 1;
    } else {
        monthlyRate = rate / 100;
    }
    
    let totalMonths: number;
    if (data.periodType === 'years') {
        totalMonths = n * 12;
    } else {
        totalMonths = n;
    }

    const futureValue = presentValue * Math.pow(1 + monthlyRate, totalMonths);
    const totalInterest = futureValue - presentValue;
    
    setResult({
      futureValue,
      totalInterest,
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Calculadora de Valor Futuro</CardTitle>
        <CardDescription>Descubra o rendimento de um investimento de montante único a uma taxa fixa.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="presentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Presente (R$)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="10000,00" {...field} />
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
                        <Input type="text" placeholder="12" {...field} />
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Período</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="periodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Período</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="months">Meses</SelectItem>
                          <SelectItem value="years">Anos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full">Calcular</Button>
            </div>
            {result && (
              <div className="flex items-center justify-center">
                <div className="space-y-4 text-center border p-8 rounded-lg bg-muted w-full">
                    <TrendingUp className="mx-auto h-12 w-12 text-primary" />
                    <p className="text-sm text-muted-foreground">Valor Futuro do Investimento</p>
                    <p className="text-4xl font-bold text-primary">{formatCurrency(result.futureValue)}</p>
                    <div className="pt-4 text-center">
                        <p className="text-muted-foreground">Total em Juros</p>
                        <p className="font-semibold text-lg">{formatCurrency(result.totalInterest)}</p>
                    </div>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
