'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { Transaction } from '@/lib/definitions';
import { editableStatus } from '@/lib/transactions';
import { setTransactionStatus } from '@/lib/transaction-writes';
import { confirmWrite } from '@/lib/write-feedback';
import { revalidateDashboard } from '@/lib/actions';
import { useFirestore, useUser } from '@/firebase';
import { useData } from '@/context/DataContext';
import { useToast } from '@/hooks/use-toast';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const labels = { PAID: 'Pago', RECEIVED: 'Recebido', PENDING: 'Pendente', LATE: 'Atrasado' };

export function TransactionStatusControl({ transaction, readOnly = false }: { transaction: Transaction; readOnly?: boolean }) {
  const db = useFirestore();
  const { user } = useUser();
  const { accounts, isDemo } = useData();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const status = editableStatus(transaction);
  const variant = status === 'LATE' ? 'destructive' : status === 'PENDING' ? 'secondary' : 'default';
  const isCard = !!transaction.paidFromAccountId || accounts?.some(account => account.id === transaction.accountId && account.type === 'CartaoCredito');
  const settled = transaction.type === 'income' ? 'RECEIVED' : 'PAID';

  async function changeStatus(next: 'PENDING' | 'PAID' | 'RECEIVED') {
    if (!user || readOnly || isDemo || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      if (await confirmWrite(setTransactionStatus(db, user.uid, transaction, next), toast)) {
        toast({ title: 'Status atualizado', description: 'Somente este lançamento foi alterado.' });
        await revalidateDashboard().catch(() => undefined);
      }
    } finally { inFlight.current = false; setSaving(false); }
  }

  if (readOnly || isDemo || !user) return <Badge variant={variant}>{labels[status]}</Badge>;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" disabled={saving} aria-busy={saving} aria-label={`Alterar status de ${transaction.description}: ${labels[status]}`}
        className={`${badgeVariants({ variant })} min-h-9 gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50`}>
        {saving ? 'Salvando...' : labels[status]}<ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {isCard ? <>
        <DropdownMenuLabel>Pagamento vinculado à fatura</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link href="/cards">Gerenciar pagamento da fatura</Link></DropdownMenuItem>
      </> : <>
        <DropdownMenuLabel>Somente este lançamento</DropdownMenuLabel>
        <DropdownMenuItem disabled={saving || status === settled} onSelect={() => void changeStatus(settled)}>
          {transaction.type === 'income' ? 'Marcar como recebido' : 'Marcar como pago'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={saving || transaction.status === 'PENDING'} onSelect={() => void changeStatus('PENDING')}>Marcar como pendente</DropdownMenuItem>
        <p className="max-w-60 px-2 py-1 text-xs text-muted-foreground">Pendências vencidas aparecem como atrasadas.</p>
      </>}
    </DropdownMenuContent>
  </DropdownMenu>;
}
