'use client';

import { useRef, useState } from 'react';
import type { Goal } from '@/lib/definitions';
import { contributeToGoal } from '@/lib/goal-writes';
import { parseMoney } from '@/lib/money';
import { formatCurrency } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { useData } from '@/context/DataContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function GoalContribution({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const { user } = useUser();
  const db = useFirestore();
  const { isBalanceVisible, isDemo } = useData();
  const { toast } = useToast();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const value = parseMoney(amount);
    if (value === null || value <= 0) {
      toast({ variant: 'destructive', title: 'Valor inválido', description: 'Informe um aporte maior que zero.' });
      return;
    }
    if (isDemo || !user) {
      toast({ title: 'Demonstração', description: 'Entre na sua conta para adicionar valores às suas metas.' });
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      await contributeToGoal(db, user.uid, goal.id, value);
      setAmount(''); setOpen(false);
      toast({ title: 'Aporte confirmado', description: 'O valor acumulado da meta foi atualizado.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Aporte não confirmado', description: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      inFlight.current = false; setSaving(false);
    }
  }

  return <>
    <Button type="button" variant="outline" size="sm" className="mt-3" disabled={goal.currentAmount >= goal.targetAmount} onClick={() => setOpen(true)}>Adicionar valor</Button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar valor à meta</DialogTitle>
          <DialogDescription>{goal.name}. Atualiza o valor guardado na meta; o saldo das contas não é alterado.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <p className="text-sm">Falta: {isBalanceVisible ? formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount)) : '•••••'}</p>
          <Label htmlFor={`contribution-${goal.id}`}>Valor do aporte (R$)</Label>
          <Input id={`contribution-${goal.id}`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="100,00" disabled={saving} />
          <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Confirmar aporte'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
