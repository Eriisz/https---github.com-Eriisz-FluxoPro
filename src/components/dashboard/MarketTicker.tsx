'use client';

import { useMarket } from '@/hooks/use-market';
import { formatCurrency } from '@/lib/utils';

export function MarketTicker() {
  const { data, isLoading } = useMarket();

  if (isLoading && !data) {
    return <div className="h-11 animate-pulse rounded-full bg-muted/40" />;
  }

  const quotes = data?.quotes || [];

  return (
    <div className="luxury-card overflow-hidden rounded-full px-2 py-2">
      <div className="flex items-center gap-6 overflow-x-auto px-3 text-xs whitespace-nowrap">
        <span className="inline-flex items-center gap-2 font-semibold tracking-[0.16em] text-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          MERCADO AO VIVO
        </span>
        {quotes.map((quote) => (
          <span key={quote.code} className="inline-flex items-center gap-2">
            <strong>{quote.code}</strong>
            <span>{formatCurrency(quote.bid)}</span>
            <span className={quote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {quote.change >= 0 ? '+' : ''}
              {quote.change.toFixed(2)}%
            </span>
          </span>
        ))}
        {data?.selic && (
          <span>
            SELIC <strong>{data.selic.value.toFixed(2)}%</strong>
          </span>
        )}
        {data?.ipca && (
          <span>
            IPCA <strong>{data.ipca.value.toFixed(2)}%</strong>
          </span>
        )}
        {quotes.length === 0 && <span className="text-muted-foreground">Cotações indisponíveis no momento.</span>}
      </div>
    </div>
  );
}
