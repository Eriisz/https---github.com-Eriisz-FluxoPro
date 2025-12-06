
'use client';

import { PageHeader } from '@/components/PageHeader';
import { InvestmentCalculator } from '@/components/calculators/InvestmentCalculator';
import { LoanCalculator } from '@/components/calculators/LoanCalculator';
import { FutureValueCalculator } from '@/components/calculators/FutureValueCalculator';
import { InflationCalculator } from '@/components/calculators/InflationCalculator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function CalculatorsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Calculadoras Financeiras" />
      <p className="text-muted-foreground -mt-6">
        Ferramentas poderosas para planejar, simular e tomar as melhores decisões para o seu futuro financeiro.
      </p>
      
      <Tabs defaultValue="investment" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="investment">Aplicação</TabsTrigger>
          <TabsTrigger value="loan">Financiamento</TabsTrigger>
          <TabsTrigger value="future-value">Valor Futuro</TabsTrigger>
          <TabsTrigger value="inflation">Correção</TabsTrigger>
        </TabsList>
        
        <TabsContent value="investment">
            <InvestmentCalculator />
        </TabsContent>
        <TabsContent value="loan">
            <LoanCalculator />
        </TabsContent>
        <TabsContent value="future-value">
            <FutureValueCalculator />
        </TabsContent>
        <TabsContent value="inflation">
            <InflationCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
