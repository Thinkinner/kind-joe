// lib/stocks.ts
import "server-only";
import { unstable_cache } from "next/cache";
import type { StockItem } from "@/types/rss";

// The symbols your UI expects
const SYMBOLS: { label: string; symbol: string }[] = [
  { label: "BITCOIN", symbol: "BINANCE:BTCUSDT" },
  { label: "GOLD", symbol: "GLD" },
  { label: "NASDAQ", symbol: "QQQ" },
  { label: "APPLE", symbol: "AAPL" },
  { label: "NVIDIA", symbol: "NVDA" },
  { label: "META", symbol: "META" },
  { label: "TESLA", symbol: "TSLA" },
  { label: "GOOGLE", symbol: "GOOGL" },
  { label: "YOUTUBE", symbol: "GOOGL" },
  { label: "MICROSOFT", symbol: "MSFT" },
];

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

function emptyStocks(): StockItem[] {
  return SYMBOLS.map(({ label }) => ({ label, changePct: 0 }));
}

function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE?.includes("build") ?? false;
}

// Fetch % change from Finnhub API
async function fetchPercentChange(symbol: string): Promise<number> {
  if (!FINNHUB_API_KEY) {
    return 0;
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
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
  } catch (error) {
    console.error(`Finnhub request timed out/failed for ${symbol}:`, error);
    return 0;
  }
}

async function fetchAllStocks(): Promise<StockItem[]> {
  // Unique symbols first to cut Finnhub rate-limit pressure (GOOGLE/YOUTUBE share GOOGL).
  const uniqueSymbols = [...new Set(SYMBOLS.map((s) => s.symbol))];
  const quotes = new Map<string, number>();

  for (const symbol of uniqueSymbols) {
    quotes.set(symbol, await fetchPercentChange(symbol));
  }

  return SYMBOLS.map(({ label, symbol }) => ({
    label,
    changePct: quotes.get(symbol) ?? 0,
  }));
}

const getCachedStocks = unstable_cache(fetchAllStocks, ["finnhub-stocks"], {
  revalidate: 60,
});

// THIS is your main function your UI calls
export async function getStocksFromFinnhub(): Promise<StockItem[]> {
  if (!FINNHUB_API_KEY || isProductionBuild()) {
    return emptyStocks();
  }

  try {
    return await getCachedStocks();
  } catch (error) {
    console.error("stocks_fetch_failed", error);
    return emptyStocks();
  }
}
