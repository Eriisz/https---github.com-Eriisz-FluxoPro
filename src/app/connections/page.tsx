'use client';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PremiumGate } from '@/components/plans/PlanSimulation';
import { CsvReconciliation } from '@/components/settings/CsvReconciliation';
export default function ConnectionsPage() {
  return <div className="space-y-6"><PageHeader title="Importação bancária" />
    <Card><CardHeader><CardTitle>Conexão automática · ainda indisponível</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">A sincronização automática depende de um provedor bancário contratado e configurado. Por enquanto, exporte o extrato CSV no seu banco e revise os lançamentos abaixo. Nenhuma senha bancária é solicitada.</CardContent></Card>
    <PremiumGate feature="csvImport"><CsvReconciliation /></PremiumGate>
  </div>;
}
