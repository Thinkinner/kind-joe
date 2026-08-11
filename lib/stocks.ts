// lib/stocks.ts — free market quotes (no Finnhub / no API key)
import "server-only";
import { unstable_cache } from "next/cache";
import type { StockItem } from "@/types/rss";

type SymbolRow = { label: string; yahoo: string };

const SYMBOLS: SymbolRow[] = [
  { label: "BITCOIN", yahoo: "BTC-USD" },
  { label: "GOLD", yahoo: "GLD" },
  { label: "NASDAQ", yahoo: "QQQ" },
  { label: "APPLE", yahoo: "AAPL" },
  { label: "NVIDIA", yahoo: "NVDA" },
  { label: "META", yahoo: "META" },
  { label: "TESLA", yahoo: "TSLA" },
  { label: "GOOGLE", yahoo: "GOOGL" },
  { label: "YOUTUBE", yahoo: "GOOGL" },
  { label: "MICROSOFT", yahoo: "MSFT" },
];

const CACHE_TTL_SECONDS = 15 * 60; // 15 minutes — free source, be polite
const YAHOO_UA =
  "Mozilla/5.0 (compatible; KindJoeBot/1.0; +https://kindjoe.com)";

type MemoryCache = {
  at: number;
  stocks: StockItem[];
};

let memoryCache: MemoryCache | null = null;
let inFlight: Promise<StockItem[]> | null = null;

function emptyStocks(): StockItem[] {
  return SYMBOLS.map(({ label }) => ({ label, changePct: 0 }));
}

function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE?.includes("build") ?? false;
}

function pctChange(current: number, previous: number): number {
  if (!isFinite(current) || !isFinite(previous) || previous === 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * Free Yahoo Finance spark endpoint — one request for all symbols, no API key.
 * Unofficial public endpoint; we cache hard so we stay light.
 */
async function fetchYahooSparkQuotes(
  yahooSymbols: string[],
): Promise<Map<string, number>> {
  const quotes = new Map<string, number>();
  const symbols = [...new Set(yahooSymbols)].join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols)}&range=5d&interval=1d&indicators=close&includeTimestamps=false`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": YAHOO_UA,
      Accept: "application/json",
    },
    next: { revalidate: CACHE_TTL_SECONDS },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`yahoo_spark_${res.status}`);
  }

  const data = (await res.json()) as {
    spark?: {
      result?: Array<{
        symbol?: string;
        response?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
          };
          indicators?: {
            quote?: Array<{ close?: Array<number | null> }>;
          };
        }>;
      }>;
    };
  };

  for (const item of data.spark?.result ?? []) {
    const symbol = item.symbol?.trim();
    if (!symbol) continue;
    const response = item.response?.[0];
    const meta = response?.meta;
    const closes =
      response?.indicators?.quote?.[0]?.close?.filter(
        (n): n is number => typeof n === "number" && isFinite(n),
      ) ?? [];

    let current = meta?.regularMarketPrice;
    let previous =
      meta?.chartPreviousClose ?? meta?.previousClose ?? undefined;

    if (
      (current == null || previous == null) &&
      closes.length >= 2
    ) {
      current = closes[closes.length - 1];
      previous = closes[closes.length - 2];
    }

    if (current != null && previous != null) {
      quotes.set(symbol, pctChange(current, previous));
    }
  }

  return quotes;
}

/** Fallback: Stooq end-of-day open→close as a rough free signal (no key). */
async function fetchStooqFallback(
  yahooSymbol: string,
): Promise<number | null> {
  // Yahoo-style → Stooq ticker
  const map: Record<string, string> = {
    "BTC-USD": "btc.v",
    GLD: "gld.us",
    QQQ: "qqq.us",
    AAPL: "aapl.us",
    NVDA: "nvda.us",
    META: "meta.us",
    TSLA: "tsla.us",
    GOOGL: "googl.us",
    MSFT: "msft.us",
  };
  const stooq = map[yahooSymbol];
  if (!stooq) return null;

  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooq)}&f=sd2t2ohlcv&h&e=csv`;
  const res = await fetch(url, {
    headers: { "User-Agent": YAHOO_UA, Accept: "text/csv,*/*" },
    next: { revalidate: CACHE_TTL_SECONDS },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;

  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  // Symbol,Date,Time,Open,High,Low,Close,Volume
  const cols = lines[1]!.split(",");
  const open = Number(cols[3]);
  const close = Number(cols[6]);
  if (!isFinite(open) || !isFinite(close) || open === 0) return null;
  return pctChange(close, open);
}

async function fetchAllStocks(): Promise<StockItem[]> {
  const uniqueYahoo = [...new Set(SYMBOLS.map((s) => s.yahoo))];
  let quotes = new Map<string, number>();

  try {
    quotes = await fetchYahooSparkQuotes(uniqueYahoo);
  } catch (error) {
    console.warn("[markets] yahoo spark failed, trying Stooq fallback", error);
  }

  // Fill any missing symbols via Stooq (still free, no key).
  for (const yahoo of uniqueYahoo) {
    if (quotes.has(yahoo)) continue;
    try {
      const pct = await fetchStooqFallback(yahoo);
      if (pct != null) quotes.set(yahoo, pct);
    } catch {
      // ignore per-symbol failures
    }
  }

  return SYMBOLS.map(({ label, yahoo }) => ({
    label,
    changePct: quotes.get(yahoo) ?? 0,
  }));
}

const getCachedStocks = unstable_cache(fetchAllStocks, ["market-stocks-free-v1"], {
  revalidate: CACHE_TTL_SECONDS,
});

async function loadStocksWithMemoryGate(): Promise<StockItem[]> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.at < CACHE_TTL_SECONDS * 1000) {
    return memoryCache.stocks;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const stocks = await getCachedStocks();
      memoryCache = { at: Date.now(), stocks };
      return stocks;
    } catch (error) {
      console.error("stocks_fetch_failed", error);
      return memoryCache?.stocks ?? emptyStocks();
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Markets ticker quotes — free sources only (Yahoo / Stooq), no API key. */
export async function getStocksFromFinnhub(): Promise<StockItem[]> {
  if (isProductionBuild()) {
    return memoryCache?.stocks ?? emptyStocks();
  }
  return loadStocksWithMemoryGate();
}
