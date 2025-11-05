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
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

// Gastos por Categoria (Gráfico de Rosca)
export function CategoryChart({ data }: { data: { category: string, total: number, fill: string }[] }) {
  const chartConfig = Object.fromEntries(
    data.map(item => [item.category, { label: item.category, color: item.fill }])
  );

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Gastos por Categoria</CardTitle>
        <CardDescription>Distribuição de despesas no mês atual</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <RechartsTooltip 
                cursor={false}
                content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(Number(value))} />}
             />
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius={60}
              strokeWidth={5}
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
  const chartConfig = {
    income: { label: "Receitas", color: "hsl(var(--chart-1))" },
    expenses: { label: "Despesas", color: "hsl(var(--destructive))" },
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Fluxo de Caixa Mensal</CardTitle>
        <CardDescription>Receitas vs. Despesas do último ano</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
             <RechartsTooltip 
                cursor={false}
                content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={4} />
            <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}


export function FutureBalanceChart({ data }: { data: { month: string, balance: number }[] }) {
    const chartConfig = {
      balance: { label: "Saldo Projetado", color: "hsl(var(--chart-1))" },
    };
  
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projeção de Saldo Futuro</CardTitle>
          <CardDescription>
            Previsão do saldo acumulado para os próximos 12 meses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              accessibilityLayer
              data={data}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <RechartsTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} hideIndicator />}
              />
              <Line
                dataKey="balance"
                type="monotone"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={true}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

    