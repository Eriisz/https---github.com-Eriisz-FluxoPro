'use client';

import Link from 'next/link';
import { ArrowRight, CircleHelp, DollarSign, ShieldCheck } from 'lucide-react';
import { DemoDataProvider } from '@/context/DataContext';
import { DashboardPageContent } from '@/components/dashboard/DashboardPageContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function DemoPage() {
  return (
    <DemoDataProvider>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-card/80 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2.5 text-primary">
              <DollarSign className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold">Demonstração FluxoPro</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Você está vendo dados fictícios e pode explorar o painel sem criar uma conta.
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Esta demonstração não grava nem altera seus dados.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/login">
                <CircleHelp className="mr-2 h-4 w-4" aria-hidden="true" />
                Já tenho conta
              </Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Criar conta
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
        <section aria-label="Guia rápido da demonstração" className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="flex gap-3 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">1</span>
              <div>
                <p className="font-medium">Veja o resumo</p>
                <a href="#overview-cards" className="text-sm text-muted-foreground underline underline-offset-4">Receitas, despesas e orçamento</a>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex gap-3 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">2</span>
              <div>
                <p className="font-medium">Antecipe o caixa</p>
                <a href="#cash-flow-forecast" className="text-sm text-muted-foreground underline underline-offset-4">Projeção de 90 dias</a>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex gap-3 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">3</span>
              <div>
                <p className="font-medium">Compartilhe resultados</p>
                <a href="#executive-report" className="text-sm text-muted-foreground underline underline-offset-4">Prévia do relatório PDF</a>
              </div>
            </CardContent>
          </Card>
        </section>
        <DashboardPageContent />
      </div>
    </DemoDataProvider>
  );
}