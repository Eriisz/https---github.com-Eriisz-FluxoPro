'use client';
import { PageHeader } from '@/components/PageHeader';
import { CardInvoices } from '@/components/cards/CardInvoices';
export default function CardsPage() { return <div className="space-y-6"><PageHeader title="Faturas de cartão" /><CardInvoices /></div>; }
