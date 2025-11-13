// lib/stocks.ts
import "server-only";
import type { StockItem } from "@/types/rss";

// The symbols your UI expects
const SYMBOLS: { label: string; symbol: string }[] = [
  { label: "GOLD", symbol: "GLD" },      // GLD ETF instead of XAUUSD (simpler + supported)
  { label: "NASDAQ", symbol: "QQQ" },
  { label: "APPLE", symbol: "AAPL" },
  { label: "NVIDIA", symbol: "NVDA" },
  { label: "META", symbol: "META" },
  { label: "TESLA", symbol: "TSLA" },
  { label: "GOOGLE", symbol: "GOOGL" },
  { label: "YOUTUBE", symbol: "GOOGL" }, // Same data, different label
  { label: "MICROSOFT", symbol: "MSFT" },
];

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  throw new Error("FINNHUB_API_KEY is not set in .env.local");
}

// Fetch % change from Finnhub API
async function fetchPercentChange(symbol: string): Promise<number> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error(`Finnhub request failed for ${symbol}:`, res.status);
    return 0;
  }

  const data = (await res.json()) as { c: number; pc: number };

  const current = data.c;
  const previous = data.pc;

  if (!isFinite(current) || !isFinite(previous) || previous === 0) {
    console.warn(`Invalid quote data for ${symbol}`, data);
    return 0;
  }

  const percent = ((current - previous) / previous) * 100;
  return Number(percent.toFixed(2));
}

// THIS is your main function your UI calls
export async function getStocksFromFinnhub(): Promise<StockItem[]> {
  const stocks = await Promise.all(
    SYMBOLS.map(async ({ label, symbol }) => {
      const changePct = await fetchPercentChange(symbol);
      return { label, changePct };
    })
  );

  return stocks;
}
