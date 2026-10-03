'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import { useUser, useFirestore } from '@/firebase';
import { buildCardInvoices, hasCardCycle, dayKey, type CardInvoice } from '@/lib/cards';
import { settleInvoice, reopenInvoice } from '@/lib/invoice-writes';
import { confirmWrite } from '@/lib/write-feedback';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const stateNames = { open: 'Em aberto', closed: 'Fechada', late: 'Em atraso', paid: 'Paga' };
const showDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : new Date(date).toLocaleDateString('pt-BR');
export function CardInvoices() {
  const { accounts, allTransactions, isBalanceVisible, isDemo } = useData();
  const { user } = useUser(); const db = useFirestore(); const { toast } = useToast();
  const [cardId, setCardId] = useState('all');
  const [period, setPeriod] = useState('all');
  const [action, setAction] = useState<{ invoice: CardInvoice; undo: boolean } | null>(null);
  const [fundingId, setFundingId] = useState(''); const [busy, setBusy] = useState(false);
  const invoices = useMemo(() => buildCardInvoices(accounts || [], allTransactions || []), [accounts, allTransactions]);
  const cards = (accounts || []).filter(account => account.type === 'CartaoCredito');
  const funding = (accounts || []).filter(account => account.type !== 'CartaoCredito');
  const periods = [...new Set(invoices.map(invoice => invoice.month))].sort();
  const visible = invoices.filter(invoice => (cardId === 'all' || invoice.account.id === cardId) && (period === 'all' || invoice.month === period));
  const money = (amount: number) => isBalanceVisible ? formatCurrency(amount) : '•••••';
  async function confirm() {
    if (!action || busy) return;
    if (isDemo || !user) { toast({ title: 'Demonstração', description: 'Entre na sua conta para registrar pagamentos.' }); return; }
    setBusy(true);
    try {
      const saved = await confirmWrite(action.undo ? reopenInvoice(db, user.uid, action.invoice.account.id, action.invoice.id)
        : settleInvoice(db, user.uid, action.invoice.account.id, action.invoice.id, fundingId, new Date(), action.invoice.remaining), toast);
      if (saved) { toast({ title: action.undo ? 'Pagamento desfeito' : 'Pagamento registrado', description: 'O saldo da conta foi atualizado sem criar outra despesa.' }); setAction(null); }
    } finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Compras no dia do fechamento entram na fatura que está fechando. Dias 29 a 31 se ajustam ao último dia do mês. O pagamento fica disponível no dia seguinte ao fechamento.</p>
    {!cards.length && <Card><CardContent className="space-y-3 p-5"><p>Cadastre um cartão com limite, fechamento e vencimento para organizar as faturas.</p><Button asChild><Link href="/accounts">Gerenciar contas e cartões</Link></Button></CardContent></Card>}
    {cards.filter(card => !hasCardCycle(card)).map(card => <p key={card.id} className="rounded-lg border p-3 text-sm">Configure fechamento e vencimento de <strong>{card.name}</strong> em <Link href="/accounts" className="underline">Contas</Link>. Os lançamentos existentes serão agrupados após a configuração.</p>)}
    <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="invoice-card">Cartão</Label><select id="invoice-card" value={cardId} onChange={event => setCardId(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="all">Todos os cartões</option>{cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}</select></div>
    <div><Label htmlFor="invoice-period">Mês de fechamento</Label><select id="invoice-period" value={period} onChange={event => setPeriod(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="all">Todas as faturas e parcelas futuras</option>{periods.map(month => <option key={month} value={month}>{month.split('-').reverse().join('/')}</option>)}</select></div></div>
    {cards.map(card => {
      const committed = (allTransactions || []).filter(row => row.accountId === card.id && row.type === 'expense' && row.status !== 'PAID').reduce((sum, row) => sum + Math.round(Math.abs(row.value) * 100), 0) / 100;
      return <div key={card.id} className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-muted/40 p-3 text-sm"><strong>{card.name}</strong><span>Limite: {money(card.limit || 0)}</span><span>Comprometido, incluindo parcelas futuras: {money(committed)}</span><span>Disponível: {money(Math.round(((card.limit || 0) - committed) * 100) / 100)}</span></div>;
    })}
    {cards.length > 0 && !visible.length && <p className="py-4 text-sm text-muted-foreground">Nenhuma fatura para os filtros selecionados.</p>}
    <div className="grid gap-4 lg:grid-cols-2">{visible.map(invoice => <Card key={invoice.id}>
      <CardHeader><CardTitle className="text-xl">{invoice.account.name} · {invoice.month.split('-').reverse().join('/')}</CardTitle><p className={invoice.state === 'late' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{stateNames[invoice.state]} · Fecha {showDate(invoice.closingDate)} · Vence {showDate(invoice.dueDate)}</p></CardHeader>
      <CardContent className="space-y-4"><dl className="grid grid-cols-3 gap-2 text-sm"><div><dt>Total</dt><dd className="font-semibold">{money(invoice.total)}</dd></div><div><dt>Pago</dt><dd>{money(invoice.paid)}</dd></div><div><dt>Restante</dt><dd className="font-semibold">{money(invoice.remaining)}</dd></div></dl>
        <details><summary className="cursor-pointer text-sm">Ver {invoice.transactions.length} compras e parcelas</summary><ul className="mt-3 space-y-2 text-sm">{invoice.transactions.map(row => <li key={row.id} className="border-b pb-2"><div className="flex justify-between gap-2"><span>{row.description}{row.installments ? ` (${row.installments.current}/${row.installments.total})` : ''}</span><span>{money(Math.abs(row.value))}</span></div><p className="text-xs text-muted-foreground">Compra: {showDate(row.date)} · {row.status === 'PAID' ? row.paidFromAccountId ? `Pago por ${(accounts || []).find(account => account.id === row.paidFromAccountId)?.name || 'conta'} em ${showDate(row.paidAt!)}` : 'Pago anteriormente, sem conta de origem vinculada' : 'Pendente'}</p></li>)}</ul></details>
        <div className="flex flex-wrap gap-2">
          {invoice.remaining > 0 && <Button disabled={invoice.state === 'open' || !funding.length} onClick={() => { setFundingId(funding[0]?.id || ''); setAction({ invoice, undo: false }); }}>Registrar pagamento</Button>}
          {invoice.transactions.some(row => row.paidFromAccountId) && <Button variant="outline" onClick={() => setAction({ invoice, undo: true })}>Desfazer pagamento</Button>}
        </div>
        {!funding.length && invoice.remaining > 0 && <p className="text-xs text-muted-foreground">Cadastre uma conta bancária de origem para pagar a fatura.</p>}
      </CardContent>
    </Card>)}</div>
    <Dialog open={!!action} onOpenChange={open => { if (!open && !busy) setAction(null); }}><DialogContent><DialogHeader><DialogTitle>{action?.undo ? 'Desfazer pagamento da fatura?' : 'Registrar pagamento da fatura'}</DialogTitle><DialogDescription>{action?.undo ? 'As compras com pagamento vinculado voltarão a ficar pendentes e os valores retornarão aos saldos das contas de origem.' : 'O valor das compras pendentes será descontado da conta escolhida. Este registro não realiza uma transferência bancária.'}</DialogDescription></DialogHeader>
      {action && <p className="font-semibold">{action.invoice.account.name} · {money(action.undo ? action.invoice.transactions.filter(row => row.paidFromAccountId).reduce((sum, row) => sum + Math.abs(row.value), 0) : action.invoice.remaining)}</p>}
      {!action?.undo && <div className="space-y-2"><Label htmlFor="invoice-funding">Conta de origem</Label><select id="invoice-funding" className="h-10 w-full rounded-md border bg-background px-3" value={fundingId} disabled={busy} onChange={event => setFundingId(event.target.value)}>{funding.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select><p className="text-xs text-muted-foreground">Data do registro: {dayKey(new Date()).split('-').reverse().join('/')}</p></div>}
      <Button disabled={busy || (!action?.undo && !fundingId)} onClick={() => void confirm()}>{busy ? 'Salvando...' : action?.undo ? 'Confirmar reversão' : 'Confirmar pagamento'}</Button>
    </DialogContent></Dialog>
  </div>;
}
