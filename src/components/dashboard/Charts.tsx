
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, Line, LineChart } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"
import { useData } from "@/context/DataContext"

// Gastos por Categoria (Gráfico de Rosca)
export function CategoryChart({ data }: { data: { category: string, total: number, fill: string }[] }) {
  const { isBalanceVisible } = useData();
  const chartConfig = Object.fromEntries(
    data.map(item => [item.category, { label: item.category, color: item.fill }])
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 text-sm bg-background border rounded-md shadow-lg">
          <p className="font-bold">{`${payload[0].name}`}</p>
          <p className="text-primary">{isBalanceVisible ? formatCurrency(payload[0].value) : '•••••'}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="luxury-card flex h-full flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Gastos por categoria</CardTitle>
        <CardDescription className="compact-hide">Distribuição de despesas no mês atual</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px] w-full"
        >
          <PieChart>
            <RechartsTooltip 
                cursor={false}
                content={<CustomTooltip />}
             />
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius={60}
              strokeWidth={5}
              label={isBalanceVisible ? undefined : () => ''}
            >
              {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="category" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// Fluxo de Caixa Mensal (Gráfico de Barras)
export function MonthlyFlowChart({ data }: { data: any[] }) {
  const { isBalanceVisible } = useData();
  const chartConfig = {
    income: { label: "Receitas", color: "hsl(var(--income))" },
    expenses: { label: "Despesas", color: "hsl(var(--expense))" },
  }

  const valueFormatter = (value: number) => isBalanceVisible ? formatCurrency(value) : '•••••';

  return (
    <Card className="luxury-card h-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Fluxo de caixa</CardTitle>
        <CardDescription className="compact-hide">Receitas vs. despesas dos últimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
             <RechartsTooltip 
                cursor={false}
                content={<ChartTooltipContent formatter={(value) => isBalanceVisible ? formatCurrency(Number(value)) : '•••••'} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="income" fill="hsl(var(--income))" radius={6} />
            <Bar dataKey="expenses" fill="hsl(var(--expense))" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
