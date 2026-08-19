/**
 * Compare Kind Joe markets ticker output vs Yahoo Finance reference.
 */
const SYMBOLS = [
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

const UA = "Mozilla/5.0 (compatible; KindJoeBot/1.0)";

function pct(current: number, previous: number): number {
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

async function yahooSpark(symbols: string[]) {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols.join(","))}&range=1d&interval=1d&indicators=close&includeTimestamps=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
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
        }>;
      }>;
    };
  };
  const out = new Map<
    string,
    { pct: number; price: number; prev: number; source: string }
  >();
  for (const item of data.spark?.result ?? []) {
    const sym = item.symbol!;
    const meta = item.response?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? 0;
    const prev = meta?.chartPreviousClose ?? meta?.previousClose ?? 0;
    out.set(sym, {
      pct: pct(price, prev),
      price,
      prev,
      source: "spark",
    });
  }
  return out;
}

/** Yahoo v8 chart — common reference for "today's change". */
async function yahooChartRef(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  const data = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
        };
      }>;
    };
  };
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice ?? 0;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose ?? 0;
  return { pct: pct(price, prev), price, prev };
}

async function main() {
  const unique = [...new Set(SYMBOLS.map((s) => s.yahoo))];
  const spark = await yahooSpark(unique);

  console.log("=== KIND JOE TICKER (what we show) ===\n");
  console.log(
    "Label".padEnd(12),
    "Yahoo".padEnd(10),
    "Change %".padStart(10),
    "Price".padStart(12),
    "Prev close".padStart(12),
  );
  console.log("-".repeat(60));

  for (const row of SYMBOLS) {
    const q = spark.get(row.yahoo);
    const change = q?.pct ?? 0;
    const sign = change > 0 ? "+" : "";
    console.log(
      row.label.padEnd(12),
      row.yahoo.padEnd(10),
      `${sign}${change.toFixed(2)}%`.padStart(10),
      (q?.price?.toFixed(2) ?? "—").padStart(12),
      (q?.prev?.toFixed(2) ?? "—").padStart(12),
    );
  }

  console.log("\n=== SPARK vs CHART REFERENCE (should match closely) ===\n");
  let mismatches = 0;
  for (const sym of unique) {
    const s = spark.get(sym);
    const ref = await yahooChartRef(sym);
    const diff = Math.abs((s?.pct ?? 0) - ref.pct);
    const ok = diff <= 0.05;
    if (!ok) mismatches++;
    console.log(
      `${sym.padEnd(10)} spark ${(s?.pct ?? 0).toFixed(2)}%  chart ${ref.pct.toFixed(2)}%  ${ok ? "OK" : "MISMATCH"}`,
    );
  }

  console.log(
    `\n${mismatches === 0 ? "All symbols align with Yahoo reference." : `${mismatches} symbol(s) differ — may be timing/cache.`}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
