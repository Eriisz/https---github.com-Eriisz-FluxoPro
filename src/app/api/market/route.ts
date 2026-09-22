import { NextResponse } from 'next/server';

type Quote = {
  code: string;
  name: string;
  bid: number;
  change: number;
};

type SeriesPoint = {
  date: string;
  value: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao consultar ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchBcbSeries(code: number): Promise<SeriesPoint | null> {
  try {
    const data = await fetchJson<Array<{ data: string; valor: string }>>(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`
    );
    const point = data[0];
    if (!point) return null;
    return { date: point.data, value: Number(point.valor.replace(',', '.')) };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const [fx, selic, ipca] = await Promise.all([
      fetchJson<Record<string, { code: string; name: string; bid: string; pctChange: string }>>(
        'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL'
      ),
      fetchBcbSeries(432),
      fetchBcbSeries(433),
    ]);

    const quotes: Quote[] = Object.values(fx).map((item) => ({
      code: item.code,
      name: item.name,
      bid: Number(item.bid),
      change: Number(item.pctChange),
    }));

    return NextResponse.json({
      live: true,
      updatedAt: new Date().toISOString(),
      quotes,
      selic,
      ipca,
    });
  } catch (error) {
    return NextResponse.json(
      {
        live: false,
        updatedAt: new Date().toISOString(),
        quotes: [],
        selic: null,
        ipca: null,
        error: error instanceof Error ? error.message : 'Falha na API de mercado',
      },
      { status: 200 }
    );
  }
}
