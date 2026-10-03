'use client';
import Link from 'next/link';
import { usePlan } from '@/context/PlanContext';
import { featureNames, planNames, type Plan, type PremiumFeature } from '@/lib/plans';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PlanBadge() {
  const { plan } = usePlan();
  return <Link href="/plans" className="rounded-full border border-primary/30 px-3 py-1 text-xs font-medium">Simulação · {planNames[plan]}</Link>;
}
export function PremiumGate({ feature, children }: { feature: PremiumFeature; children: React.ReactNode }) {
  const { allows } = usePlan();
  if (allows(feature)) return <>{children}</>;
  return <Card><CardHeader><CardTitle>{featureNames[feature]}</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">Recurso disponível na simulação Premium e Vitalício. Seus dados continuam preservados ao trocar de plano.</p>
    <Button asChild variant="outline"><Link href="/plans">Comparar e simular planos</Link></Button>
  </CardContent></Card>;
}
export function PlanSimulation() {
  const { plan, selectPlan } = usePlan();
  return <section id="plan-simulation" className="space-y-5" aria-label="Simulação de planos">
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="font-semibold">Simulação de uso · {planNames[plan]}</p>
      <p className="mt-1 text-sm text-muted-foreground">Experimente os recursos de cada plano neste navegador. Não há cobrança, compra ou assinatura ativa. Preços ainda serão definidos.</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-3">{(['free', 'premium', 'lifetime'] as Plan[]).map(id => <Card key={id} className={plan === id ? 'border-primary' : ''}>
      <CardHeader><CardTitle>{planNames[id]}</CardTitle><p className="text-sm text-muted-foreground">{id === 'free' ? 'Controle essencial gratuito' : id === 'premium' ? 'Proposta de assinatura recorrente' : 'Proposta de pagamento único, sem renovação'}</p></CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          <li>Contas, categorias e transações manuais</li><li>Faturas e compras parceladas</li><li>Metas e orçamento total do mês</li><li>Backup e restauração dos seus dados</li><li>Lembretes no painel: próximos 3 dias</li>
          {id === 'free' ? <li>Previsão diária de 7 dias</li> : Object.values(featureNames).map(name => <li key={name}>✓ {name}</li>)}
        </ul>
        <Button className="w-full" variant={plan === id ? 'secondary' : 'default'} disabled={plan === id} onClick={() => selectPlan(id)}>{plan === id ? 'Plano em simulação' : `Simular ${planNames[id]}`}</Button>
      </CardContent>
    </Card>)}</div>
    <p className="text-sm text-muted-foreground">Premium e Vitalício oferecem os mesmos recursos nesta proposta. Conexão bancária automática não está incluída na simulação: depende de uma integração futura. Alterar o plano não apaga dados nem cancela registros financeiros.</p>
  </section>;
}
