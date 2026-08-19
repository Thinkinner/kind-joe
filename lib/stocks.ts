// lib/stocks.ts — market quotes (Finnhub primary, Yahoo / Stooq fallback)
import "server-only";
import { unstable_cache } from "next/cache";
import type { StockItem } from "@/types/rss";

type SymbolRow = { label: string; finnhub: string; yahoo: string };

const SYMBOLS: SymbolRow[] = [
  { label: "BITCOIN", finnhub: "BINANCE:BTCUSDT", yahoo: "BTC-USD" },
  { label: "GOLD", finnhub: "GLD", yahoo: "GLD" },
  { label: "NASDAQ", finnhub: "QQQ", yahoo: "QQQ" },
  { label: "APPLE", finnhub: "AAPL", yahoo: "AAPL" },
  { label: "NVIDIA", finnhub: "NVDA", yahoo: "NVDA" },
  { label: "META", finnhub: "META", yahoo: "META" },
  { label: "TESLA", finnhub: "TSLA", yahoo: "TSLA" },
  { label: "GOOGLE", finnhub: "GOOGL", yahoo: "GOOGL" },
  { label: "YOUTUBE", finnhub: "GOOGL", yahoo: "GOOGL" },
  { label: "MICROSOFT", finnhub: "MSFT", yahoo: "MSFT" },
];

const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes — 9 Finnhub calls per refresh max
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

function finnhubToken(): string | null {
  const key = process.env.FINNHUB_API_KEY?.trim();
  return key || null;
}

function pctChange(current: number, previous: number): number {
  if (!isFinite(current) || !isFinite(previous) || previous === 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

type FinnhubQuote = { dp?: number; c?: number };

async function fetchFinnhubQuote(
  symbol: string,
  token: string,
): Promise<number | null> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    next: { revalidate: CACHE_TTL_SECONDS },
    signal: AbortSignal.timeout(8000),
  });

  if (res.status === 429) {
    throw new Error("finnhub_rate_limit");
  }
  if (!res.ok) return null;

  const data = (await res.json()) as FinnhubQuote;
  if (typeof data.dp !== "number" || !isFinite(data.dp)) return null;
  // Finnhub returns c=0 when no live quote exists for the symbol.
  if (typeof data.c !== "number" || !isFinite(data.c) || data.c === 0) {
    return null;
  }
  return Number(data.dp.toFixed(2));
}

/** One quote call per unique symbol — 9 calls max, parallel, cached 5 min. */
async function fetchFinnhubQuotes(
  finnhubSymbols: string[],
): Promise<Map<string, number>> {
  const token = finnhubToken();
  if (!token) return new Map();

  const unique = [...new Set(finnhubSymbols)];
  const pairs = await Promise.all(
    unique.map(async (symbol) => {
      try {
        const dp = await fetchFinnhubQuote(symbol, token);
        return [symbol, dp] as const;
      } catch (error) {
        if (error instanceof Error && error.message === "finnhub_rate_limit") {
          throw error;
        }
        return [symbol, null] as const;
      }
    }),
  );

  const quotes = new Map<string, number>();
  for (const [symbol, dp] of pairs) {
    if (dp != null) quotes.set(symbol, dp);
  }
  return quotes;
}

/**
 * Yahoo Finance spark — one batched request for all symbols, no API key.
 * Used only when Finnhub is unavailable or missing symbols.
 */
async function fetchYahooSparkQuotes(
  yahooSymbols: string[],
): Promise<Map<string, number>> {
  const quotes = new Map<string, number>();
  const symbols = [...new Set(yahooSymbols)].join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols)}&range=1d&interval=1d&indicators=close&includeTimestamps=false`;

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

/** Stooq end-of-day open→close — last-resort per symbol, no key. */
async function fetchStooqFallback(
  yahooSymbol: string,
): Promise<number | null> {
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
  const cols = lines[1]!.split(",");
  const open = Number(cols[3]);
  const close = Number(cols[6]);
  if (!isFinite(open) || !isFinite(close) || open === 0) return null;
  return pctChange(close, open);
}

function yahooSymbolsMissingFinnhub(
  finnhubQuotes: Map<string, number>,
): string[] {
  const missing = new Set<string>();
  for (const { finnhub, yahoo } of SYMBOLS) {
    if (!finnhubQuotes.has(finnhub)) missing.add(yahoo);
  }
  return [...missing];
}

async function fetchAllStocks(): Promise<StockItem[]> {
  const uniqueYahoo = [...new Set(SYMBOLS.map((s) => s.yahoo))];
  let finnhubQuotes = new Map<string, number>();
  let finnhubFailed = false;

  try {
    finnhubQuotes = await fetchFinnhubQuotes(
      SYMBOLS.map((s) => s.finnhub),
    );
  } catch (error) {
    finnhubFailed = true;
    console.warn("[markets] finnhub unavailable, using fallbacks", error);
  }

  let yahooQuotes = new Map<string, number>();
  const yahooTargets =
    finnhubFailed || finnhubQuotes.size === 0
      ? uniqueYahoo
      : yahooSymbolsMissingFinnhub(finnhubQuotes);

  if (yahooTargets.length > 0) {
    try {
      yahooQuotes = await fetchYahooSparkQuotes(yahooTargets);
    } catch (error) {
      console.warn("[markets] yahoo spark failed", error);
    }
  }

  for (const yahoo of uniqueYahoo) {
    const coveredByFinnhub = SYMBOLS.some(
      (s) => s.yahoo === yahoo && finnhubQuotes.has(s.finnhub),
    );
    if (coveredByFinnhub || yahooQuotes.has(yahoo)) continue;
    try {
      const pct = await fetchStooqFallback(yahoo);
      if (pct != null) yahooQuotes.set(yahoo, pct);
    } catch {
      // ignore per-symbol failures
    }
  }

  return SYMBOLS.map(({ label, finnhub, yahoo }) => ({
    label,
    changePct:
      finnhubQuotes.get(finnhub) ??
      yahooQuotes.get(yahoo) ??
      0,
  }));
}

const getCachedStocks = unstable_cache(fetchAllStocks, ["market-stocks-finnhub-v1"], {
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

/** Markets ticker quotes — Finnhub primary, Yahoo / Stooq fallback. */
export async function getStocksFromFinnhub(): Promise<StockItem[]> {
  if (isProductionBuild()) {
    return memoryCache?.stocks ?? emptyStocks();
  }
  return loadStocksWithMemoryGate();
}
