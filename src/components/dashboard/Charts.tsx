
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
import { useAppearance } from "@/context/AppearanceContext"

const PALETTE_CHART_COLORS = {
  gold: ['hsl(42 58% 42%)', 'hsl(28 80% 46%)', 'hsl(201 70% 36%)', 'hsl(262 30% 42%)', 'hsl(186 40% 36%)'],
  ocean: ['hsl(199 78% 36%)', 'hsl(184 70% 40%)', 'hsl(42 78% 46%)', 'hsl(262 42% 48%)', 'hsl(152 45% 36%)'],
  forest: ['hsl(152 40% 28%)', 'hsl(35 72% 44%)', 'hsl(199 64% 38%)', 'hsl(262 34% 46%)', 'hsl(186 44% 34%)'],
  ruby: ['hsl(350 55% 38%)', 'hsl(18 72% 46%)', 'hsl(201 70% 38%)', 'hsl(262 34% 48%)', 'hsl(152 42% 34%)'],
  graphite: ['hsl(220 12% 32%)', 'hsl(210 26% 46%)', 'hsl(42 62% 44%)', 'hsl(262 28% 46%)', 'hsl(186 38% 36%)'],
} as const;

const COLORBLIND_CHART_COLORS = [
  'hsl(201 98% 36%)',
  'hsl(37 98% 44%)',
  'hsl(48 95% 48%)',
  'hsl(326 48% 48%)',
  'hsl(186 80% 32%)',
];

function getChartColors(palette: keyof typeof PALETTE_CHART_COLORS, colorblind: boolean) {
  return colorblind ? COLORBLIND_CHART_COLORS : PALETTE_CHART_COLORS[palette];
}

// Gastos por Categoria (Gráfico de Rosca)
export function CategoryChart({ data }: { data: { category: string, total: number, fill: string }[] }) {
  const { isBalanceVisible } = useData();
  const { palette, colorblind } = useAppearance();
  const colors = getChartColors(palette, colorblind);
  const chartConfig = Object.fromEntries(
    data.map((item, index) => [item.category, { label: item.category, color: colors[index % colors.length] }])
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
        <CardDescription>Distribuição de despesas no mês atual</CardDescription>
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
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
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
        <CardDescription>Receitas vs. despesas dos últimos 12 meses</CardDescription>
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
