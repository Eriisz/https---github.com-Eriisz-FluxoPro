
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
import { AreaChart, Banknote } from 'lucide-react';
import { useData } from '@/context/DataContext';

const formSchema = z.object({
  initialValue: z.string().min(1, 'Obrigatório'),
  correctionRate: z.string().min(1, 'Obrigatório'),
  period: z.string().min(1, 'Obrigatório'),
});

type FormValues = z.infer<typeof formSchema>;

interface CalculationResult {
  correctedValue: number;
  totalCorrection: number;
}

export function InflationCalculator() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const { isBalanceVisible } = useData();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      initialValue: '1000',
      correctionRate: '4.5',
      period: '12',
    },
  });

  function onSubmit(data: FormValues) {
    const initialValue = parseFloat(data.initialValue.replace(',', '.'));
    const correctionRate = parseFloat(data.correctionRate.replace(',', '.')) / 100;
    const period = parseInt(data.period, 10);
    
    // Simple compound interest formula for correction
    const correctedValue = initialValue * Math.pow(1 + correctionRate / 12, period);
    const totalCorrection = correctedValue - initialValue;
    
    setResult({
      correctedValue,
      totalCorrection,
    });
  }

  const hiddenValue = '•••••';

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Calculadora de Correção de Valores</CardTitle>
        <CardDescription>
            Simule a atualização de um valor com base em uma taxa percentual ao longo do tempo (ex: inflação).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="initialValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Inicial (R$)</FormLabel>
                    <FormControl>
                      <Input type={isBalanceVisible ? 'text' : 'password'} placeholder="1000,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="correctionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Correção Anual (%)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="4,5" {...field} />
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
                    <FormLabel>Período (meses)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Calcular Correção</Button>
            </div>
            {result && (
              <div className="flex items-center justify-center">
                <div className="space-y-4 text-center border p-8 rounded-lg bg-muted w-full">
                    <Banknote className="mx-auto h-12 w-12 text-primary" />
                    <p className="text-sm text-muted-foreground">Valor Corrigido</p>
                    <p className="text-4xl font-bold text-primary">{isBalanceVisible ? formatCurrency(result.correctedValue) : hiddenValue}</p>
                    <div className="pt-4 text-center">
                        <p className="text-muted-foreground">Variação Total</p>
                        <p className="font-semibold text-lg">{isBalanceVisible ? formatCurrency(result.totalCorrection) : hiddenValue}</p>
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
