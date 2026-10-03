'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useData } from '@/context/DataContext';
import { usePlan } from '@/context/PlanContext';
import { buildReminders, defaultReminderSettings, parseReminderSettings } from '@/lib/reminders';
import { dayKey } from '@/lib/cards';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function ReminderCenter({ compact = false }: { compact?: boolean }) {
  const { accounts, allTransactions, budgets, categories, isBalanceVisible, isDemo } = useData();
  const { user } = useUser();
  const { allows } = usePlan();
  const canConfigure = allows('reminderSettings');
  const key = `fluxopro:reminders:${isDemo ? 'demo' : user?.uid || 'guest'}`;
  const [stored, setStored] = useState({ key: '', settings: { ...defaultReminderSettings }, dismissed: {} as Record<string, string> });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      const dismissed = raw.dismissed && typeof raw.dismissed === 'object' && !Array.isArray(raw.dismissed) ? raw.dismissed : {};
      setStored({ key, settings: parseReminderSettings(raw.settings), dismissed });
    } catch { setStored({ key, settings: { ...defaultReminderSettings }, dismissed: {} }); }
  }, [key]);
  const state = stored.key === key ? stored : { key, settings: defaultReminderSettings, dismissed: {} as Record<string, string> };
  const settings = canConfigure ? state.settings : defaultReminderSettings;
  function save(next: typeof state) { setStored(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Browser-only preferences. */ } }
  const reminders = buildReminders(accounts || [], allTransactions || [], (budgets || []).filter(item => canConfigure || !item.categoryId), categories || [], settings, now);
  const visible = reminders.filter(item => state.dismissed[item.id] !== dayKey(now));
  return <Card><CardHeader><CardTitle>Lembretes e limites</CardTitle><p className="text-sm text-muted-foreground">Avisos atualizados enquanto o site está aberto. Preferências salvas neste navegador.</p></CardHeader>
    <CardContent className="space-y-4">
      {!compact && (canConfigure ? <div className="grid gap-4 sm:grid-cols-2">
        <Label className="flex items-center gap-2"><input type="checkbox" checked={settings.enabled} onChange={event => save({ ...state, settings: { ...settings, enabled: event.target.checked } })} />Ativar lembretes</Label>
        <Label className="flex items-center gap-2"><input type="checkbox" checked={settings.includeIncome} onChange={event => save({ ...state, settings: { ...settings, includeIncome: event.target.checked } })} />Incluir valores a receber</Label>
        <div className="space-y-2"><Label htmlFor="reminder-days">Antecedência (0 a 30 dias)</Label><Input id="reminder-days" type="number" min={0} max={30} value={settings.daysAhead} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 0 && value <= 30) save({ ...state, settings: { ...settings, daysAhead: value } }); }} /></div>
        <div className="space-y-2"><Label htmlFor="budget-alert">Avisar ao atingir o orçamento</Label><select id="budget-alert" className="h-10 w-full rounded-md border bg-background px-3" value={settings.budgetPercent} onChange={event => save({ ...state, settings: { ...settings, budgetPercent: Number(event.target.value) } })}>{[50, 70, 80, 90, 100].map(value => <option key={value} value={value}>{value}%</option>)}</select></div>
      </div> : <p className="text-sm text-muted-foreground">Free: avisos de atrasos, próximos 3 dias e orçamento a partir de 80%. <Link className="underline" href="/plans">Simule Premium para configurar.</Link></p>)}
      {!visible.length && <p className="text-sm text-muted-foreground">{settings.enabled ? 'Nenhum lembrete pendente nesta janela.' : 'Lembretes desativados.'}</p>}
      <ul className="space-y-3">{visible.slice(0, compact ? 4 : 100).map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <div className="min-w-0"><Link className="font-medium hover:underline" href={item.href}>{item.title}</Link><p className={`text-xs ${item.urgent ? 'text-destructive' : 'text-muted-foreground'}`}>{item.detail} · {item.date.split('-').reverse().join('/')}</p></div>
        <div className="flex items-center gap-2"><span className="text-sm">{isBalanceVisible ? formatCurrency(item.amount) : '•••••'}</span><Button size="sm" variant="ghost" onClick={() => save({ ...state, dismissed: { ...Object.fromEntries(Object.entries(state.dismissed).filter(([, date]) => date === dayKey(now))), [item.id]: dayKey(now) } })}>Ocultar hoje</Button></div>
      </li>)}</ul>
      {compact && <Button variant="link" asChild><Link href="/reminders">Ver todos e configurar lembretes</Link></Button>}
      {!compact && Object.values(state.dismissed).includes(dayKey(now)) && <Button variant="outline" onClick={() => save({ ...state, dismissed: {} })}>Mostrar lembretes ocultados</Button>}
    </CardContent>
  </Card>;
}
