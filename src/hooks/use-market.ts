'use client';

import { useEffect, useState } from 'react';

export type MarketQuote = {
  code: string;
  name: string;
  bid: number;
  change: number;
};

export type MarketSnapshot = {
  live: boolean;
  updatedAt: string;
  quotes: MarketQuote[];
  selic: { date: string; value: number } | null;
  ipca: { date: string; value: number } | null;
};

export function useMarket(pollMs = 60000) {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/market', { cache: 'no-store' });
        const json = (await response.json()) as MarketSnapshot;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          setData({
            live: false,
            updatedAt: new Date().toISOString(),
            quotes: [],
            selic: null,
            ipca: null,
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pollMs]);

  return { data, isLoading };
}
